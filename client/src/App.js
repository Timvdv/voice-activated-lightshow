import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import "./App.css";

import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";

const Index = () => (
  <header className="App-header">
    <img
      src="https://d2ddoduugvun08.cloudfront.net/items/1R312k2S370c3K0S0e3N/Group%202.png?X-CloudApp-Visitor-Id=0b5fdff493ce9e840623443fd2aa20e1&v=2f9b9ec6"
      className="App-logo"
      alt="logo"
    />
    <p>Voice activated lightshow</p>

    <a
      className="App-link"
      href="https://reactjs.org"
      target="_blank"
      rel="noopener noreferrer"
    >
      Install the skill on Amazon Alexa
    </a>

    <footer>
      <Link to="/privacy">
        Privacy Policy
      </Link>

      {" "}-{" "}

      <Link to="/tos">
        Terms of Service
      </Link>
    </footer>    
  </header>
);

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Route path="/" exact component={Index} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/tos" component={TermsOfService} />
        </div>
      </Router>
    );
  }
}

export default App;
