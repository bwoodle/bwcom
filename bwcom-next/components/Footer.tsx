import React from 'react';

const Footer: React.FC = () => {
  const version = process.env.npm_package_version || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  return (
    <footer style={{ padding: '1rem', backgroundColor: '#333', color: '#fff', textAlign: 'center', marginTop: '2rem' }}>
      <p>Version: {version} | Environment: {environment}</p>
    </footer>
  );
};

export default Footer;