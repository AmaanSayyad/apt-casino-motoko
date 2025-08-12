// Simple Connection Status Component for Local Games
import React from "react";
import { FaWifi, FaWifiSlash, FaGamepad } from "react-icons/fa";

const ConnectionStatus = ({
  isConnected,
  tokenActor,
  gameMode = null,
  className = "",
}) => {
  const getStatusInfo = () => {
    if (gameMode === "offline") {
      return {
        icon: <FaWifiSlash className="text-gray-400" />,
        text: "Offline Mode",
        color: "text-gray-400",
        bg: "bg-gray-900/50",
      };
    }

    if (gameMode === "demo") {
      return {
        icon: <FaGamepad className="text-yellow-400" />,
        text: "Demo Mode",
        color: "text-yellow-400",
        bg: "bg-yellow-900/20",
      };
    }

    if (!isConnected) {
      return {
        icon: <FaWifiSlash className="text-red-400" />,
        text: "Not Connected",
        color: "text-red-400",
        bg: "bg-red-900/20",
      };
    }

    if (!tokenActor) {
      return {
        icon: <FaWifiSlash className="text-orange-400" />,
        text: "Service Unavailable",
        color: "text-orange-400",
        bg: "bg-orange-900/20",
      };
    }

    return {
      icon: <FaWifi className="text-green-400" />,
      text: "Connected",
      color: "text-green-400",
      bg: "bg-green-900/20",
    };
  };

  const status = getStatusInfo();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-lg ${status.bg} ${className}`}
    >
      {status.icon}
      <span className={`text-sm font-medium ${status.color}`}>
        {status.text}
      </span>
    </div>
  );
};

export default ConnectionStatus;
