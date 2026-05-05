import Link from 'next/link';
import LogoutButton from './LogoutButton';

const Navbar: React.FC = () => {
    return (
        <nav className="bg-black border-b border-gray-700 text-white sticky w-full top-0 z-50">
            <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
                {/* Dashboard Link */}
                <div>
                    <Link href="/dashboard" className="text-xl font-semibold hover:text-gray-400">
                        Dashboard
                    </Link>
                </div>

                {/* Icon Links */}
                <div className="flex items-center space-x-6">
                    {/* Logout Icon */}
                    <LogoutButton/>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;