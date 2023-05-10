export default function Footer({ isCold }: { isCold: boolean }) {
  return (
    <footer>
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
        <p className="border-t border-dashed border-gray-200 mt-10 p-4 text-center text-xs leading-5 text-gray-500">
          &copy; 2023 Nutshimit. All rights reserved.
          <div className="mt-4">
            Powered by{" "}
            <a
              href="https://workers.cloudflare.com/"
              className="underline underline-offset-4 hover:no-underline"
            >
              Cloudflare Workers
            </a>{" "}
            {isCold && <span className="italic">(on a cold run)</span>}
          </div>
        </p>
      </div>
    </footer>
  );
}
