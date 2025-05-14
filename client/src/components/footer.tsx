import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} A Toast to You
          </div>
          <div className="flex space-x-6">
            <Link href="#">
              <a className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Privacy Policy</span>
                <span className="text-sm">Privacy</span>
              </a>
            </Link>
            <Link href="#">
              <a className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Terms of Service</span>
                <span className="text-sm">Terms</span>
              </a>
            </Link>
            <Link href="#">
              <a className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Help Center</span>
                <span className="text-sm">Help</span>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
