import React from 'react';
import './Button.css'; 

// Default button styles based on the style guide configuration
const defaultStyles = {
  backgroundColor: '#ff00aa', // Primary color from style guide
  color: '#000000', // Text color from style guide
  padding: '16px', // Medium spacing from style guide
  fontFamily: 'Inter, sans-serif', // Font family from style guide
  fontWeight: '400', // Regular font weight from style guide
  fontSize: '16px', // Base font size from style guide
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  boxSizing: 'border-box',
  display: 'inline-block',
  textAlign: 'center',
  lineHeight: '1.5',
  minWidth: '120px',
};

// Button Component
const Button = ({ label, onClick, style = {}, className = '', disabled = false }) => {
  const buttonStyles = { ...defaultStyles, ...style, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' };

  return (
    <button
      style={buttonStyles}
      onClick={onClick}
      className={`button-component ${className}`}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default Button;
