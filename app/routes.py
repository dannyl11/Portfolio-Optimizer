from dotenv import load_dotenv
load_dotenv()

from utils.pipeline import run_portfolio_optimization
from flask import Blueprint, render_template, request, jsonify
import numpy as np

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/optimize', methods=['POST'])
def optimize():
    print("Received POST request to /optimize")

    #user inputs
    data = request.get_json()
    print("Request JSON:", data)

    capital = data.get('capital') #float/int
    horizon = data.get('horizon') #str
    tickers = data.get('tickers') #list of str
    desired_return = data.get('desired_return') #float

    if not all([capital, tickers, horizon, desired_return]):
        return jsonify({'error': 'Missing one or more required fields'}), 400

    portfolio_np = run_portfolio_optimization(capital, horizon, tickers, desired_return)
    portfolio = {k: float(v) if isinstance(v, np.floating) else v 
                         for k, v in portfolio_np.items()}
    print(portfolio)
    return jsonify(portfolio)