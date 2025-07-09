import requests
import datetime as dt
import pandas as pd
import os
import pandas as pd
import alpaca_trade_api as tradeapi
import numpy as np
from dotenv import load_dotenv

def get_treasury_yields(horizon) -> dict[str, float]:
    fred_key = os.getenv("FRED_API_KEY")
    base_url = 'https://api.stlouisfed.org/fred/series/observations'

    series_ids = {
        'short': 'DGS3MO',
        'medium': 'DGS2',
        'long': 'DGS5'
    }
    
    end_date = dt.date.today()
    start_date = end_date - dt.timedelta(days=7)

    params = {
        'series_id': series_ids[horizon],
        'api_key': fred_key,
        'file_type': 'json',
        'observation_start': start_date,
        'observation_end': end_date
    }
    
    response = requests.get(base_url, params=params)
    data = response.json()
    df = pd.DataFrame(data['observations'])
    rate = float(df.iloc[-1, 3])
    return rate / 100

def get_alpaca_data(tickers: list, horizon: str, lookbacks: dict) -> pd.DataFrame:
    load_dotenv()
    alpaca_key = os.getenv("ALPACA_API_KEY")
    alpaca_secret_key = os.getenv("ALPACA_SECRET_KEY")
    base_url = 'https://paper-api.alpaca.markets/v2'

    #get stock data
    api = tradeapi.REST(alpaca_key, alpaca_secret_key, base_url, api_version='v2')
    end_date = dt.datetime.today()
    start_date = end_date - dt.timedelta(days=lookbacks[horizon][0] * 365)
    temp = api.get_bars(
        symbol=tickers,
        timeframe='1Day',
        start=start_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
        end=end_date.strftime('%Y-%m-%dT%H:%M:%SZ')
    ).df
    data = pd.DataFrame()
    for ticker in tickers:
        data[ticker] = temp[temp['symbol'] == ticker]['close']
    data.index = data.index.date
    data = data.iloc[::lookbacks[horizon][1]]
    return data

def get_s0(data: pd.DataFrame) -> np.ndarray:
    s0 = data.iloc[-1].to_numpy()
    return s0