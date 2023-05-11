import { useEffect, useState } from "preact/hooks";
import { Logo } from "../components/icons";
import Footer from "../components/footer";
import instantsearch from "instantsearch.js";
import algoliasearch from "algoliasearch/lite";
import { searchBox, hits } from "instantsearch.js/es/widgets";

export function IndexPage({
  isCold,
  appId,
  apiKey,
  indexName,
}: {
  isCold: boolean;
  appId: string;
  apiKey: string;
  indexName: string;
}) {
  const [isReady, setReady] = useState(false);
  const [isEmpty, setEmpty] = useState(true);
  useEffect(() => {
    if (!isReady) {
      const searchClient = algoliasearch(appId, apiKey);

      const search = instantsearch({
        indexName: indexName,
        searchClient,
        onStateChange: (state) => {
          setEmpty(state.uiState[indexName].query === undefined);
          state.setUiState(state.uiState);
        },
      });

      search.addWidgets([
        searchBox({
          container: "#searchbox",
          searchAsYouType: true,
          placeholder: "Search providers, e.g., MySQL...",
          autofocus: true,
          showLoadingIndicator: false,
          showReset: false,
          showSubmit: false,
          cssClasses: {
            input:
              "h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 !focus:ring-0 !outline-none sm:text-sm",
          },
        }),
        hits({
          container: "#hits",
          cssClasses: {
            emptyRoot: "hidden",
            list: "divide-y divide-gray-100",
            item: "flex justify-between gap-x-6 py-5",
          },
          escapeHTML: true,
          templates: {
            item: `

            <div class="group relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50 text-left">
              <div class="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                <img src="https://github.com/{{ owner }}.png" className="h-6 w-6" />
              </div>
              <div>
                <a href="/{{ name }}@{{ latest_version }}" class="font-semibold text-gray-900">
                  {{#helpers.highlight}}{ "attribute": "name", "highlightedTagName": "mark" }{{/helpers.highlight}}
                  <span class="absolute inset-0"></span>
                </a>
                <p class="mt-1 text-gray-600 w-64 text-xs">
                {{#helpers.highlight}}{ "attribute": "description", "highlightedTagName": "mark" }{{/helpers.highlight}}
                </p>
              </div>
            </div>
            `,
          },
        }),
      ]);

      search.start();
      setReady(true);
    }
  }, [isReady, setReady]);

  return (
    <div className="min-h-full">
      <div class="bg-white">
        <header class="absolute inset-x-0 top-0 z-50">
          <nav
            class="flex items-center justify-between p-6 lg:px-8"
            aria-label="Global"
          >
            <div class="flex lg:flex-1">
              <Logo className="h-8" />
              <h1 className="ml-2 text-2xl text-sky-900 font-light">
                mashin.run
              </h1>
            </div>

            <div class="hidden lg:flex lg:flex-1 lg:justify-end">
              <a
                href="https://github.com/nutshimit/mashin_registry#publishing-a-module-to-the-registry"
                class="text-sm font-semibold leading-6 text-gray-900"
              >
                Submit provider <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </nav>
        </header>

        <div class="relative isolate px-6 pt-14 lg:px-8">
          <div
            class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#bae6fd] to-[#0369a1] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            ></div>
          </div>
          <div class="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div class="text-center">
              <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Supercharge your Infrastructure as Code
              </h1>
              <p class="mt-6 text-lg leading-8 text-gray-600">
                Seamlessly find, integrate, and manage a universe of
                community-driven providers with Mashin's registry. Welcome to
                the future of IaC.
              </p>

              <div className="flex items-center justify-center m-4">
                <div class="relative">
                  <div className="w-96 rounded-t-xl bg-white shadow-2xl transform  overflow-hidden ring-1 ring-black ring-opacity-5 transition-all">
                    <svg
                      class="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div id="searchbox"></div>
                  </div>

                  <div class={`absolute w-96 ${isEmpty && "hidden"}`}>
                    <div class="rounded-b-xl bg-white transform max-w-xl overflow-hidden ring-1 ring-black ring-opacity-5 transition-all">
                      <div id="hits" className="pl-3"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-10 flex items-center justify-center gap-x-6">
                <a
                  href="https://docs.mashin.land/docs/getting-started#installation"
                  class="rounded-md bg-sky-700 px-3.5 py-2.5 text-lg font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Install Mashin
                </a>
                <a
                  href="https://docs.mashin.land/docs/build-index"
                  class="rounded-md bg-sky-700 px-3.5 py-2.5 text-lg font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Getting started
                </a>
              </div>
            </div>
          </div>
          <div
            class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
            aria-hidden="true"
          >
            <div
              class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#0369a1] to-[#bae6fd] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
              style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            ></div>
          </div>
        </div>
      </div>

      <Footer isCold={isCold} />
    </div>
  );
}
