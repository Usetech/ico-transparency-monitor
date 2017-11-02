import axios from 'axios';
import moment from 'moment';
import jquery from './utils/jQuery';
import config from './config';

export const deepFreeze = (obj) => {
  if (obj !== null && typeof obj === 'object') {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      deepFreeze(obj[prop]);
    });
  }
  return obj;
};

export const toPromise = func => (...args) =>
  new Promise((resolve, reject) =>
    func(...args, (error, result) => (error ? reject(new Error(error.message)) : resolve(result)))
  );


export const formatNumber = (number, precision = 2) => {
  if (isNaN(number) || typeof number === 'undefined') { return 'Not Available'; }
  if (number === undefined || !number || typeof number !== 'number') { return number; }
  return number.toFixed(precision).replace(/./g, (c, i, a) => i && c !== '.' && ((a.length - i) % 3 === 0) ? ` ${c}` : c);
};

export const isCorrectTokenAddress = address => address.match('0x[A-Za-z0-9]{40}');

export const icoTransparencyLevel = Object.freeze({ NONTRANSPARENT: 'nontransparent', WITHISSUES: 'withissues', TRANSPARENT: 'transparent' });

export const icoTransparencyMap = { NONTRANSPARENT: 'NON TRANSPARENT', WITHISSUES: 'WITH ISSUES', TRANSPARENT: 'TRANSPARENT' };

export const criticalToTransparencyLevel = critical =>
  critical ? icoTransparencyLevel.NONTRANSPARENT : icoTransparencyLevel.WITHISSUES;

export const computeICOTransparency = (answers) => {
  const foundIssues = {};
  let hasCritical = false;

  Object.keys(config.matrix).forEach((key) => {
    if (config.matrix.hasOwnProperty(key)) {
      const answer = answers[key];
      const definition = config.matrix[key];
      // return lists of transparent-with-issues and non-transparent a answers
      if ((answer.answer === false || answer.answer === null) && !definition.notApplicable) {
        foundIssues[key] = true;
        hasCritical = hasCritical || definition.critical;
      }
    }
  });

  if (Object.keys(foundIssues).length !== 0) {
    return [criticalToTransparencyLevel(hasCritical), foundIssues];
  }
  return [icoTransparencyLevel.TRANSPARENT, foundIssues];
};

// eslint-disable-next-line
Date.prototype.formatDate = function (fullFormat = false) {
  return moment(this).format(fullFormat ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
};

// eslint-disable-next-line
String.prototype.capitalizeTxt = String.prototype.capitalizeTxt || function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// coinbase requires UTC string
export const getEtherRate = async (currency, time) => axios.get(`https://api.coinbase.com/v2/prices/${currency}/spot?date=${time.toISOString()}`);

export const getValueOrNotAvailable = (props, input) => props && props[input] ? props[input] : 'Not Available';

export const getValueOrDefault = value => value || 'Not Available';

export const trimString = value => value.replace(/ /g, '');

export const getICOLogs = (blockRange, icoConfig, contracts, callback) => {
  const eventName = blockRange[2];
  const event = icoConfig.events[eventName];
  const contract = contracts[event.address || icoConfig.address];
  const address = contract.address;

  console.log(`Start scanning for block range ${blockRange} at ${address}`);
  const filter = contract[eventName](event.customArgs || {}, {
    fromBlock: blockRange[0],
    toBlock: blockRange[1],
  });
  filter.stopWatching(() => {});

  return jquery.ajax({
    type: 'POST',
    url: config.rpcHost,
    Accept: 'application/json',
    contentType: 'application/json',
    data: JSON.stringify({
      id: 1497353430507566, // keep this ID to make cache work
      jsonrpc: '2.0',
      params: [{
        fromBlock: filter.options.fromBlock,
        toBlock: filter.options.toBlock,
        address,
        topics: filter.options.topics,
      }],
      method: 'eth_getLogsDetails',
    }),
    success: (response) => {
      if (response.error) {
        callback('SHOW_MODAL_ERROR', `Error when getting logs ${response.error.message}`);
      } else {
        const res = response.result;
        console.log(`formatting ${res.length} log entries`);
        const logsFormat = res.map(log => filter.formatter ? filter.formatter(log) : log);
        callback(null, logsFormat);
      }
    },
    error: (response) => {
      callback('SHOW_MODAL_ERROR', `Server returned error: ${response.status}`);
    },
    dataType: 'json',
  });
};

const calculateTicks = (max) => {
  let tick = 0.1;
  const ticks = [];
  ticks.push(tick);
  while (tick < max) {
    tick *= 10;
    ticks.push(tick);
  }

  return ticks;
};

export const kFormatter = (num) => {
  const ranges = [
    { divider: 1e18, suffix: 'P' },
    { divider: 1e15, suffix: 'E' },
    { divider: 1e12, suffix: 'T' },
    { divider: 1e9, suffix: 'G' },
    { divider: 1e6, suffix: 'M' },
    { divider: 1e3, suffix: 'k' },
  ];

  for (let i = 0; i < ranges.length; i += 1) {
    if (num >= ranges[i].divider) {
      return (num / ranges[i].divider).toString() + ranges[i].suffix;
    }
  }
  return num.toString();
};

export const getEtherDistribution = (sortedInvestors, currencyPerEther) => {
  const max = sortedInvestors[0].value * currencyPerEther;
  // investors
  const investorsChartXAxis = [];
  // investment
  const investmentChartXAxis = [];

  const ticks = calculateTicks(max);
  let previousTick = 0;

  for (let i = 0; i < ticks.length; i += 1) {
    const tick = ticks[i];
    const name = `${kFormatter(previousTick)} - ${kFormatter(tick)}`;
    investorsChartXAxis.push({ name: `${name}`, amount: 0 });
    investmentChartXAxis.push({ name: `${name}`, amount: 0 });
    previousTick = tick;
  }

  sortedInvestors.forEach((item) => {
    const money = item.value * currencyPerEther;
    for (let i = 0; i < ticks.length; i += 1) {
      if (money < ticks[i]) {
        investorsChartXAxis[i].amount += 1;
        investmentChartXAxis[i].amount += parseFloat(money.toFixed(2));
        break;
      }
    }
  });

  return [investorsChartXAxis, investmentChartXAxis];
};

/* eslint-disable */
export const downloadCSV = fileName => async (dispatch, getState) => {
  const csvContentArray = getState().scan.csvContent;

  let csvContent = ['Investor Address', 'Token Amount', 'Ether Value',
    'Timestamp', 'Block Number', '\n'].join(',');
  csvContentArray.forEach((item, index) => {
    const dataString = item.join(',');
    csvContent += index < csvContentArray.length ? `${dataString}\n` : dataString;
  });
  
  const csvData = new Blob([csvContent], { type: 'application/csv;charset=utf-8;' });
  // FOR OTHER BROWSERS
  const link = document.createElement('a');
  link.href = URL.createObjectURL(csvData);
  link.style = 'visibility:hidden';
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
/* eslint-enable */

export const getNextICO = (address) => {
  const icosKeys = Object.keys(config.ICOs);
  const currentICOIndex = icosKeys.indexOf(address) % (icosKeys.length - 1);
  const nextICOIndex = currentICOIndex + 1;
  const nextICO = icosKeys[nextICOIndex];
  window.location = `/#/${nextICO}`;
  window.location.reload();
};

export const getICODuration = (endTime, startTime) =>
  moment.duration(moment(endTime).diff(moment(startTime)));
