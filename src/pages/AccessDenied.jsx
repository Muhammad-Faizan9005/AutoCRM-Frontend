import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

const AccessDenied = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
        <ShieldOff size={22} />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">
        Access denied
      </h1>
      <p className="mt-2 text-sm text-gray-500 max-w-md">
        You do not have permission to view this section. Contact an admin to
        request access.
      </p>
      <Link
        to="/"
        className="mt-5 px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold"
      >
        Return to dashboard
      </Link>
    </div>
  );
};

export default AccessDenied;
