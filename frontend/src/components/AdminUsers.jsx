import React, { useEffect, useState, useCallback } from 'react';
import { API, apiFetch } from '../services/http';
import './AdminUsers.css';

const ROLES = ['developer', 'business_user', 'admin'];

export function AdminUsers({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('developer');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiFetch(`${API}/auth/users`);
      if (!resp.ok) throw new Error('Failed to load users');
      setUsers(await resp.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const resp = await apiFetch(`${API}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed to create user');
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('developer');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user) => {
    setError('');
    try {
      const resp = await apiFetch(`${API}/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!resp.ok) throw new Error('Failed to update user');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-users-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Manage Users</h2>
        <p className="modal-subtitle">Create and manage developer, business user, and admin accounts.</p>

        {error && <div className="admin-users-error">{error}</div>}

        <form className="admin-users-form" onSubmit={handleCreate}>
          <input
            className="au-input" type="email" placeholder="Email" required
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            className="au-input" type="text" placeholder="Full name"
            value={fullName} onChange={e => setFullName(e.target.value)}
          />
          <input
            className="au-input" type="password" placeholder="Password (min 8 chars)" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <select className="au-input" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="au-create-btn" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create User'}
          </button>
        </form>

        <table className="au-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="au-empty">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="au-empty">No users yet.</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.fullName || '—'}</td>
                <td><span className="au-role-badge">{u.role}</span></td>
                <td>
                  <span className={`au-status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="au-toggle-btn" onClick={() => handleToggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
