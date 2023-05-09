import { Logo } from "./icons";

export default function Nav() {
  return (
    <nav className="bg-sky-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center">
              <Logo className="h-8" />
              <h1 className="ml-2 text-2xl text-sky-900 font-light">
                mashin.run
              </h1>
            </div>
          </div>
          <div className="block">
            <div className="ml-10 flex items-baseline space-x-4 text-sky-700">
              <strong>Mashin registry</strong>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
