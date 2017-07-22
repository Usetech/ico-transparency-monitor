import React, { Component } from 'react';
import '../assets/css/App.css';
import ICO from '../components/ICO';
import ScanBoxLoadingMessage from '../components/ScanBoxLoadingMessage';
import ScanBoxDetails from '../components/ScanBoxDetails';
import { default as config } from '../config.js';
import { connect } from 'react-redux';
import { Grid, Row, Col } from 'react-flexbox-grid';
import { getLogs } from '../reducers/web3';
import { getNextICO } from '../utils';

class Scan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isBlockMounted:false
    }
  }
  render() {
    if(this.props.blocks  && this.state.isBlockMounted === false){
      this.setState({isBlockMounted:true});
      this.props.getLogs(this.props.address);
    }
    return (
      <div className="App">
        {this.state.isBlockMounted && <div>
          <Grid>
            <Row className="nav-buttons">
              <Col md={6}>
                <div className="back-list">
                  <button onClick={()=>window.location="/"} className="arrow-btn arrow-btn-left"><span className="arrow arrow-left">&#8592;</span></button>
                  <a href="/">Go back to the list </a>
                </div>
              </Col>
              <Col md={6}>
                <div className="next-list">
                  <a className="pointer-cursor" onClick={()=>{
                    getNextICO(this.props.address);
                  }}> Go to the next</a>

                  <button onClick={()=>{
                    getNextICO(this.props.address);
                  }} className="arrow-btn arrow-btn-right"><span className="arrow">&#8594;</span></button>
                </div>
              </Col>
            </Row>
          </Grid>

          <Grid className="scanbox ico-box-scan">
            {<ICO ico={this.props.ico} isInSingleICOView address={this.props.address} />}
            {this.props.isLoading && <ScanBoxLoadingMessage />}
            {!this.props.isLoading && this.props.isComponentReady && <ScanBoxDetails address={this.props.address} /> }
          </Grid>
        </div>}
      </div>
    );
  }
}

const mapStateToProps = (state, props) => {
  const address = props.match.params.name;
  return {
    address:address,
    ico: config.ICOs[address],
    currencyValue: state.currency.value,
    isComponentReady: state.scan.showStats,
    isLoading: state.scan.showLoader,
    web3: state.modal.web3,
    blocks:state.blocks
  };
};

const mapDispatchToProps = dispatch => ({
  getLogs: (address) => {
    dispatch(getLogs(address));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Scan);
