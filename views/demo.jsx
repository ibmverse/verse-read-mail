import React from 'react';
import {Icon, Tabs, Pane} from 'watson-react-components';
import 'whatwg-fetch'
import voices from '../voices';

const synthesizeUrl = `/api/synthesize?voice={this.state.voice.name}&text={encodeURIComponent(this.state.text)}`;

/**
 * @return {Function} A polyfill for URLSearchParams
 */
const getSearchParams = () => {
  if (typeof URLSearchParams === 'function') {
    return new URLSearchParams();
  } 

  //simple polyfill for URLSearchparams
  var searchParams = function () {
  };

  searchParams.prototype.set = function (key, value) {
    this[key] = value;
  };

  searchParams.prototype.toString = function () {
    return Object.keys(this).map(function (v) {
      return `${encodeURI(v)}=${encodeURI(this[v])}`;
    }.bind(this)).join("&");
  };
  return new searchParams();
};

/**
 * Validates that the mimetype is: audio/wav, audio/mpeg;codecs=mp3 or audio/ogg;codecs=opus
 * @param  {String} mimeType The audio mimetype
 * @return {bool} Returns true if the mimetype can be played.
 */
const canPlayAudioFormat = (mimeType) => {
  var audio = document.createElement('audio');
  if (audio) {
    return (typeof audio.canPlayType === 'function' && audio.canPlayType(mimeType) !== '');
  } else {
    return false
  }
};

/**
 * Add a '\n' when parse a domNode and meet these tags
 */
const NEWLINE_TAGS = { p: 1, br: 1, td: 1, div: 1, li: 1 };

/**
 *The default skip tags
 * @type {Map}
 */
const SKIP_TAGS = {a: 1, style: 1, script: 1, iframe: 1 };

/**
 * Parse the specified dom node's html and get its plain text.
 *
 * @param {Node} domNode - the specified dom node
 * @return {Array<String>} an array to store the plain text by line
 */
const parseHtml = (domNode) => {
  if (!domNode) {
    return '';
  }
  var plainText = [];
  var walker = document.createTreeWalker(domNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, filterTag, true);
  while (walker.nextNode()) {
    var value = walker.currentNode.nodeValue ? walker.currentNode.nodeValue.replace(/\r\n/g,'').replace(/\s/g,' ') : null;
    var name = walker.currentNode.nodeName;
    var text =  name.toLowerCase() in NEWLINE_TAGS ? '\n' : value;
    if(text && text.length > 0) {
      plainText.push(text);
    }
  }
  return plainText.join('');
};

/**
 * Get the filter option used by the a document's tree walker to determine whether or not to accept a node.
 *
 * @param {Node} node - the domnode
 * @return {Object} the filter option
 */
const filterTag = (node) => {
  if (!node) {
    return NodeFilter.FILTER_SKIP;
  }
  if (node.nodeType == Node.TEXT_NODE) {
    if (node.nodeValue && !(/[^\t\n\r ]/.test(node.nodeValue))) {
      return NodeFilter.FILTER_SKIP;
    }
    var parentNode = node.parentNode;
    if (parentNode && parentNode.tagName && parentNode.tagName.toLowerCase() in SKIP_TAGS) {
      return NodeFilter.FILTER_SKIP;
    }
    return NodeFilter.FILTER_ACCEPT;
  }
  return node.tagName && node.tagName.toLowerCase() in NEWLINE_TAGS ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
};

class ConditionalSpeakButton extends React.Component {
  componentDidMount() {
    if (canPlayAudioFormat('audio/ogg;codecs=opus')) {
      this.setState({canPlay: true});
    } else {
      this.setState({canPlay: false});
    }
  }

  render() {
    if (this.state && this.state.canPlay) {
      return (
        <button disabled={this.props.disabled} onClick={this.props.onClick} className={ this.props.loading ? "base--button speak-button loading" : "base--button speak-button"}>
          Read
        </button>
      );
    } else {
      return (
        <span>
          <button
            onClick={this.props.onClick}
            className="base--button speak-button speak-disabled"
            title="Only available on Chrome and Firefox"
            disabled={true}
          >
            Read
          </button>
        </span>
      );
    }
  }
}

class LoadingStep extends React.Component {
  render() {
    return (
      <div>
        <div className={`step-wrapper ${this.props.loading ? 'active' : ''} ${this.props.finished ? 'finished' : ''}`}>
          <span className="step-number">{this.props.number}</span>
          <span className="step-message">{this.props.textContent}</span>
          <Icon type="loader"/>
          <span className="success-wrapper">
            <Icon type="success"/>
          </span>
        </div>
      </div>
    );
  }
}

export default React.createClass({

  getInitialState() {
    return {
      voice: voices[3], // Alisson is the first voice
      error: null, // the error from calling /classify
      text: 'Error happened, I do not get the message body.', // default text
      loading: true,
      currentStep: 1,
      stepOneFinished: false,
      stepTwoFinished: false,
      hasAudio: false,
      messageLoaded: false
    };
  },

  componentDidMount() {
    this.createMessageHandler();
  },

  onTextChange(event) {
    this.setState({text: event.target.value});
  },

  setupParamsFromState(do_download, text) {
    var params = getSearchParams();
    params.set('text', text || this.state.text);
    params.set('voice', this.state.voice.name);
    params.set('download', do_download);

    if (!canPlayAudioFormat('audio/ogg;codec=opus') && canPlayAudioFormat('audio/wav')) {
      params.set('accept', 'audio/wav');
    }
    return params;
  },

  createMessageHandler() {
    window.addEventListener("message", event => {
      var eventData = event.data;
      if (eventData.verseApiType == "com.ibm.verse.ping.application.loaded") {
        var message = { verseApiType : "com.ibm.verse.application.loaded" };
        event.source.postMessage(message, event.origin);
      } else if (eventData.verseApiType == "com.ibm.verse.ping.widget.loaded") {
        var message = { verseApiType : "com.ibm.verse.widget.loaded" };
        event.source.postMessage(message, event.origin);
      }
      if (eventData.verseApiType === "com.ibm.verse.action.clicked") {
        var actionData = eventData.verseApiData;
        if (actionData.actionId === "com.ibm.verse.ext.mail.read.message.action") {
          var context = actionData.context;
          // get the message body
          if (context) {
            var tmpNode = document.createElement('div');
            tmpNode.innerHTML = context.body;
            var textContent = parseHtml(tmpNode);
            this.setState({ text: textContent, messageLoaded: true, stepOneFinished: true, currentStep: 2 });
            this.startRead(textContent);
          }
        }
       }  
    }, false);
  },

  startRead(textContent) {
    const params = this.setupParamsFromState(true, textContent);
    const audio = document.getElementById('audio');
    audio.setAttribute('src', '');

    fetch(`/api/synthesize?${params.toString()}`).then((response) => {
      if (response.ok) {
        response.blob().then((blob) => {
          this.setState({ loading: false, stepTwoFinished: true });
          const url = window.URL.createObjectURL(blob);
          this.setState({ loading: false, hasAudio: true });

          audio.setAttribute('src', url);
          audio.setAttribute('type', 'audio/ogg;codecs=opus');
        });
      } else {
        this.setState({ loading: false, stepTwoFinished: true });
        response.json().then((json) => {
          this.setState({ error: json });
        });
      }
    })
  },

  render() {
    return (
      <div className="output-container">
        <LoadingStep number={1} textContent='Get message content' loading={this.state.loading && this.state.currentStep == 1} finished={this.state.stepOneFinished}/>
        <LoadingStep number={2} textContent='Read message' loading={this.state.loading && this.state.currentStep == 2} finished={this.state.stepTwoFinished}/>
        <div className={`errorMessage ${this.state.error ? '' : 'hidden'}`}>
          <Icon type="error" />
          <span className="err-content">{this.state.error ? this.state.error.error : ''}</span>
        </div>
        <div className="audio-wrapper">
          <audio autoPlay="true" id="audio" className={`audio ${this.state.hasAudio ? '' : 'hidden'}`} controls="controls">
            Your browser does not support the audio element.
          </audio>
        </div>
        <div className="title-container">
          " This is an Action Contribution rendered in <span>embedded iframe</span> "
        </div>
      </div>
    );
  }
});
