import React from 'react';

const Footer: React.FC = () => {
  const version = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  return (
    <footer style={{ padding: '1rem', backgroundColor: '#333', color: '#fff', textAlign: 'center', position: 'fixed', bottom: 0, width: '100%' }}>
      <p>Version: {version} | Environment: {environment}</p>
    </footer>
  );
};

export default Footer;