export default function Login({ onLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl w-full max-w-md p-8">
        <h2 className="text-2xl font-semibold text-center mb-6">CRM</h2>

        <input
          type="email"
          placeholder="Email Address"
          className="w-full border p-2 rounded mb-3"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded mb-4"
        />

        <button
          onClick={onLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Log In
        </button>
      </div>
    </div>
  );
}
