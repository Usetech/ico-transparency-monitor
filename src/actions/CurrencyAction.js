import axios from 'axios';
import moment from 'moment';
import { getEtherDistribution } from '../utils';

export const setCurrencyAction = (currency, amount, time) =>
  ({ type: 'SET_CURRENCY', currency, value: amount, time });

export const setExchangeProvider = provider => async (dispatch, getState) => {
  dispatch({ type: 'SET_CURRENCY_PROVIDER', provider });
};

export const getExchangeRate = async (base, to, provider, time) => {
  let result = null;
  switch (provider) {
    case 'coinbase':
      // coinbase requires UTC string
      const converted = base === 'ETH' ? to : base;
      const key = `ETH-${converted}`.toUpperCase();
      result = await axios.get(`https://api.coinbase.com/v2/prices/${key}/spot?date=${time.toISOString()}`);
      return base === 'ETH' ? result.data.data.amount : (1 / result.data.data.amount);
    case 'fixer':
      const timeFormated = moment(time).format('YYYY-MM-DD');
      result = await axios.get(`https://api.fixer.io/${timeFormated}?base=${base}`);
      return result.data.rates[to];
    default:
      throw new Error('Not supported exchange');
  }
};

export const getExchangeProvider = (key, isSmartContract = false) => {
  if (isSmartContract) {
    return {
      name: 'Smart Contract',
      link: 'Smart Contract returns the currency rate',
    };
  }
  switch (key) {
    case 'ETH-EUR':
    case 'EUR-ETH':
    case 'ETH-USD':
    case 'USD-ETH':
      return {
        name: 'coinbase',
        link: 'https://api.coinbase.com/v2/prices',
      };
    case 'EUR-USD':
    case 'USD-EUR':
      return {
        name: 'fixer',
        link: 'https://api.fixer.io/',
      };
    case 'ETH-ETH':
    case 'USD-USD':
    case 'EUR-EUR':
      break;
    default:
      throw new Error('Not supported exchange');
  }
};

export const getCurrency = async (currency, baseCurrency, time) => {
  if (currency === baseCurrency) return 1;

  const currencyKey = `${baseCurrency}-${currency}`.toUpperCase();
  const provider = getExchangeProvider(currencyKey);
  const result = await getExchangeRate(baseCurrency,
    currency,
    provider.name,
    time
  );
  return result;
};

export const setStatisticsByCurrency = (currency, value, time) => async (dispatch, getState) => {
  dispatch(setCurrencyAction(currency, value, time));
  const currentStatistics = getState().scan.stats;
  const distribution = getEtherDistribution(currentStatistics.investors.sortedByETH, value);
  currentStatistics.charts.investorsDistribution = distribution[0];
  currentStatistics.charts.investmentDistribution = distribution[1];
  dispatch({ type: 'DRAW_STATS', stats: currentStatistics });
};
