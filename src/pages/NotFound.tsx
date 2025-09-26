import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-100">
      <div className="tw-text-center">
        <h1 className="tw-text-4xl tw-font-bold tw-mb-4">404</h1>
        <p className="tw-text-xl tw-text-gray-600 tw-mb-4">Oops! Page not found</p>
        <a href="/" className="tw-text-blue-500 hover:tw-text-blue-700 tw-underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;