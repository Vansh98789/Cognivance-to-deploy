import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NavLink } from 'react-router-dom';

const links = [
  { to: 'work', label: 'Find Work' },
  { to: 'interview', label: 'Interview' },
  { to: 'passport', label: 'My Passport' },
  { to: 'job', label: 'Create Job' },
  { to: 'history', label: 'My History' },
];

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b">

      <div>
        <span className="font-bold">Cognivance</span>
      </div>

      <div className="flex gap-4">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? "font-bold" : ""
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div>
        <WalletMultiButton />
      </div>

    </nav>
  );
};

export default Navbar;