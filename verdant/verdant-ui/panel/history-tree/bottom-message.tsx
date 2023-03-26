/*import * as React from 'react';
import './Message.css';

const css = `
.message {
  position: fixed;
  bottom: 0;
  width: 100%;
  background-color: #ccc;
  padding: 10px;
  text-align: center;
  transition: opacity 0.5s ease-in-out;
  opacity: 0;
}

.message.show {
  opacity: 1;
}
`
type BottomMessage_Props = {
  message: string,
  showMessage: Boolean
}
type BottomMessage_State = {
  isVisible: Boolean,
}

export class BottomMessage extends React.Component<BottomMessage_Props, BottomMessage_State> {
  timerId: NodeJS.Timeout;

  constructor(props: BottomMessage_Props) {
    super(props);
    this.state = { isVisible: false };
    this.timerId = null;
  }

  componentWillUnmount() {
    clearTimeout(this.timerId);
  }

  handleShowMessage = () => {
    this.setState({ isVisible: true });
    this.timerId = setTimeout(() => {
      this.setState({ isVisible: false });
    }, 5000);
  };

  render() {
    if ()
    return (
      <div>
        <style>{css}</style>
        <button onClick={this.handleShowMessage}>Show Message</button>
        {this.state.isVisible && (
          <div className="message">
            This is a message with a grey background.
          </div>
        )}
        {}
      </div>
    );
  }
}
*/


import React, { useState, useEffect } from 'react';

const css = `
.message {
  display: block;
  position: absolute;
  bottom: 0;
  left: 50%;
  right: 50%;
  transform: translate(-50%, -50%);
  width: 210px;
  background-color: #eee;
  padding: 10px;
  text-align: center;
  border-radius: 5px;
  transition: opacity 0.5s ease-in-out;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.4);
}

.message.visible {
  pointer-events: auto;
  display: block;
  opacity: 1;
}
`
const BottomMessage = ({ message, show, setShow }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setTimeout(() => {
        setIsVisible(false);
        setShow(false);
      }, 5000);
    }
  }, [show]);

  const handleTransitionEnd = () => {
    if (!isVisible) {
      setShow(false);
    }
  };

  return (
    <div>
      <style>{css}</style>
      <div
        className={`message ${isVisible ? 'visible' : ''}`}
        onTransitionEnd={handleTransitionEnd}
        // style={{
        //   position: 'absolute',
        //   bottom: 0,
        //   left: "50%",
        //   right: "50%",
        //   transform: "translate(-50%, -50%)",
        //   width: "200px",
        //   textAlign: "center",
        //   backgroundColor: '#eee',
        //   color: '#000',
        //   padding: '10px',
        //   display: isVisible ? 'block' : 'none',
        //   borderRadius: "4px",
        // }}
      >
        {message}
      </div>
    </div>
  );
};

export default BottomMessage