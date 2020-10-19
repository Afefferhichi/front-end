import constants from "../config/constants";
import {TEST_TOKEN} from './tests/config/constants'

const timeout = 5000;
const LocalStorageIsNotDefined = (typeof localStorage === 'undefined');

let fetch2;
let fs;
let https;
if (typeof fetch === 'undefined') {
  fetch2 = require('node-fetch');
  https = require('https');
  fs = require('fs');
} else
  fetch2 = fetch;

let AbortController2;
if (typeof AbortController === 'undefined')
  AbortController2 = require('abort-controller');
else
  AbortController2 = AbortController;

class CallServerClass {
  timeout = 0;

  get(api) {
    return this.request(api);
  }

  delete(api) {
    return this.request(api, 'DELETE');
  }

  post(api, post_data) {
    return this.request(api, 'POST', post_data)
  }

  postWithFile(api, post_data) {
    return this.request(api, 'POST_WITH_FILE', post_data)
  }

  put(api, post_data) {
    return this.request(api, 'PUT', post_data)
  }

  putWithFile(api, post_data) {
    return this.request(api, 'PUT_WITH_FILE', post_data)
  }

  request(api, method = 'GET', post_data) {
    let options, sslConfiguredAgent;
    if(fs) {
      options = {
        cert: fs.readFileSync(
          ('./cert.pem'),
          `utf-8`,
        ),
        key: fs.readFileSync(
          ('./key.pem'),
          'utf-8',
        ),
        rejectUnauthorized: false,
        keepAlive: false,
      };
      sslConfiguredAgent = new https.Agent(options);
    }

    return new Promise((resolve, eject) => {
      const fetchUrl = constants.API_SERVER;
      const controller = new AbortController2();
      let responseText = '';
      fetch2(fetchUrl + api, {
        ...({
          method: (
            method === 'POST_WITH_FILE'
              ? 'POST'
              : method === 'PUT_WITH_FILE'
              ? 'PUT' : method)
        }),
        cache: 'no-store',
        ...(fs ? {agent: sslConfiguredAgent,} : {}),
        headers: {
          ...(method === 'POST' || method === 'PUT' ? {'Content-Type': 'application/json'} : {}),
          charset: 'utf-8',
          token: LocalStorageIsNotDefined ? TEST_TOKEN : localStorage.getItem('token')
        },
        ...(method === 'POST' || method === 'PUT' ? {body: JSON.stringify(post_data)} : {}),
        ...(method === 'POST_WITH_FILE' || method === 'PUT_WITH_FILE' ? {body: post_data} : {}),
        signal: controller.signal,
      })
        .then(async response => {
          try {
            responseText = await response.text();
            clearTimeout(this.timeout);
            return JSON.parse(responseText);
          } catch (error) {
            console.log(error, response);
          }
        })
        .then(response => resolve(response))
        .catch(error => {
          clearTimeout(this.timeout);
          if (error.name === 'AbortError') {
            resolve({success: false, data: null});
          } else {
            error.responseText = responseText;
            eject(error);
          }
        });
      this.timeout = setTimeout(() => {
        controller.abort();
      }, timeout ? timeout : 10000)
    });
  }
};

export default new CallServerClass();