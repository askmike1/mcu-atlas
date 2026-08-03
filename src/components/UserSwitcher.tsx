import type { User } from '../types';

interface UserSwitcherProps {
  users: User[];
  currentUserId: string;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export default function UserSwitcher({ users, currentUserId, onSwitch, onAdd, onRename, onRemove }: UserSwitcherProps) {
  const currentUser = users.find((u) => u.id === currentUserId);

  const handleAdd = () => {
    const name = window.prompt('Name for new user?');
    if (name && name.trim()) onAdd(name.trim());
  };

  const handleRename = () => {
    const name = window.prompt('Rename user', currentUser?.name ?? '');
    if (name && name.trim()) onRename(currentUserId, name.trim());
  };

  const handleRemove = () => {
    if (window.confirm(`Remove user "${currentUser?.name}"? This deletes their watched progress.`)) {
      onRemove(currentUserId);
    }
  };

  return (
    <div className="user-switcher">
      <select value={currentUserId} onChange={(evt) => onSwitch(evt.target.value)} aria-label="Current user">
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <button type="button" title="Add user" aria-label="Add user" onClick={handleAdd}>
        +
      </button>
      <button type="button" title="Rename user" aria-label="Rename user" onClick={handleRename}>
        ✎
      </button>
      {users.length > 1 && (
        <button type="button" className="danger" title="Remove user" aria-label="Remove user" onClick={handleRemove}>
          ×
        </button>
      )}
    </div>
  );
}
