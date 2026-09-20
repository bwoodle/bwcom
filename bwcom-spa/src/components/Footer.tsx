import React from "react";

const Footer: React.FC = () => {
  const version = import.meta.env.VITE_APP_VERSION || "1.0.0";
  const environment = import.meta.env.MODE || "development";

  return (
    <footer
      style={{
        padding: "1rem",
        backgroundColor: "#333",
        color: "#fff",
        textAlign: "center",
      }}
    >
      <p>
        Version: {version} | Environment: {environment}
      </p>
    </footer>
  );
};

export default Footer;
