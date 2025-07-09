from utils.math_tools import mean_variance_analysis, covar_matrix, ff_ev
from utils.api_tools import get_treasury_yields, get_alpaca_data, get_s0

def run_portfolio_optimization(CAPITAL, HORIZON, TICKERS, DESIRED_RETURN):
    #(years of data, increment (days), factor to annualize)
    lookbacks = {'short': (2, 1, 252), 'medium': (5, 5, 52), 'long': (10, 20, 12)}

    #get stock data
    stock_data = get_alpaca_data(TICKERS, HORIZON, lookbacks)  

    empty_columns = stock_data.columns[stock_data.isna().all()]
    if not empty_columns.empty:
        raise ValueError(f"The following data is missing: {list(empty_columns)}")

    #create covariance matrix
    covars = covar_matrix(stock_data, lookbacks[HORIZON][2])

    #get risk free rate
    risk_free_rate = get_treasury_yields(HORIZON)

    #get current prices
    s0 = get_s0(stock_data)

    #get expected values with fama french model
    ev = ff_ev(stock_data, s0, HORIZON)

    #optimize portfolio
    portfolio = mean_variance_analysis(TICKERS, s0, ev, covars, CAPITAL, 
                                         risk_free_rate, DESIRED_RETURN)
    return portfolio