import numpy as np
import pandas as pd
import statsmodels.api as sm

def mean_variance_analysis(tickers: list, s0: np.ndarray, ev: np.ndarray, covars: np.ndarray, 
                           initial_capital: float, risk_free_rate: float, 
                           expected_return: float) -> dict[str, float]:
    # Returns
    mu = (ev - s0) / s0

    # Risk-per-dollar
    for i in range(len(s0)):
        for j in range(len(s0)):
            covars[i][j] /= s0[i] * s0[j]

    # Step 1: Excess return
    excess_returns = mu - risk_free_rate

    # Step 2: Tangency portfolio direction y_hat
    y_hat = np.linalg.solve(covars, excess_returns)

    # Step 3: Solve for lambda
    lam = (initial_capital * (expected_return-risk_free_rate)) / (np.dot(excess_returns, y_hat))

    # Step 4: Capital allocation
    x_hat = lam * y_hat
    risk_free = initial_capital - np.sum(x_hat)

    allocation = dict()

    for i in range(len(x_hat)):
        allocation[tickers[i]] = round(x_hat[i], 2)
    allocation['Risk-free asset'] = round(risk_free, 2)
    return allocation

def covar_matrix(df: pd.DataFrame, factor: int) -> np.ndarray:
    dollar_changes = df.diff().dropna()
    matrix = np.cov(dollar_changes, rowvar=False)
    annualized_matrix = matrix * factor
    return annualized_matrix

def ff_ev(stock_data: pd.DataFrame, s0: np.ndarray, horizon: str)-> np.ndarray:
    simple_returns = stock_data.pct_change().dropna()
    simple_returns.index = pd.to_datetime(simple_returns.index)
    if horizon == 'medium' or horizon == 'long':
        norm_returns = simple_returns.resample('W-FRI').sum() #use weekly data
        #get Mkt-rf, SMB, HML, and RF
        factor_df = pd.read_csv('data/F-F_weekly_3_factor.csv', skiprows=4)
        annualize_factor = 52
    else:
        norm_returns = simple_returns
        factor_df = pd.read_csv('data/F-F_daily_3_factor.csv', skiprows=4)
        annualize_factor = 252

    #align FF factors with returns
    factor_df = factor_df[:-1]
    factor_df.set_index(factor_df.columns[0], inplace=True)
    factor_df.index = pd.to_datetime(factor_df.index, format='%Y%m%d')
    fama_filtered = factor_df.loc[factor_df.index.intersection(norm_returns.index)].copy()
    fama_filtered[['Mkt-RF', 'SMB', 'HML', 'RF']] /= 100

    norm_returns = norm_returns.loc[norm_returns.index.intersection(fama_filtered.index)].copy()

    betas = {}
    for stock in norm_returns.columns:
        y = norm_returns[stock]
        X = fama_filtered[['Mkt-RF', 'SMB', 'HML']]
        X = sm.add_constant(X)
        model = sm.OLS(y, X).fit()
        betas[stock] = model.params.drop('const')
    betas_df = pd.DataFrame(betas).T
    
    expected_returns = np.zeros(len(norm_returns.columns))
    factor_means = fama_filtered[['Mkt-RF', 'SMB', 'HML']].mean()

    for i in range(len(betas_df.index)):
        expected_returns[i] = fama_filtered['RF'].mean() + np.dot(betas_df.iloc[i], factor_means)
    ev = (1 + expected_returns) ** annualize_factor * s0
    return ev