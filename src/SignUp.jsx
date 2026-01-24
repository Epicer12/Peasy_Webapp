import React, { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link } from 'react-router-dom';
import './index.css';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      alert(`Sign-up successful! Welcome, ${userCredential.user.email}`);
      // TODO: redirect to login page or dashboard
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered.');
      } else if (error.code === 'auth/weak-password') {
        alert('Password should be at least 6 characters.');
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
          >
            Sign Up
          </button>
        </form>

        {/* Link to go back to Login */}
        <p className="text-center mt-4 text-sm">
          Already have an account?{' '}
          <Link to="/" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;