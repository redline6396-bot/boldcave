export default function HomeLoading() {
  return (
    <main className="bg-white text-neutral-950">
      <section className="min-h-[72vh] bg-neutral-50 px-5 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-[1380px] flex-col justify-end">
          <div className="h-4 w-28 bg-neutral-100" />
          <div className="mt-4 h-12 w-full max-w-[520px] bg-neutral-100 sm:h-16" />
          <div className="mt-4 h-5 w-full max-w-[380px] bg-neutral-100" />
          <div className="mt-8 h-11 w-36 bg-neutral-100" />
        </div>
      </section>

      <section className="px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="mx-auto h-8 w-56 bg-neutral-100" />
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="mx-auto w-full max-w-[388px] border border-[#e8e2d9] bg-white"
              >
                <div className="aspect-square bg-neutral-50" />
                <div className="px-3 pb-4 pt-3 text-center sm:px-6 sm:pb-6 sm:pt-4">
                  <div className="mx-auto h-5 w-3/4 bg-neutral-100 sm:h-6" />
                  <div className="mx-auto mt-3 h-3 w-2/3 bg-neutral-100" />
                  <div className="mx-auto mt-4 h-4 w-24 bg-neutral-100" />
                  <div className="mt-3 h-11 border border-neutral-200 bg-neutral-100 sm:mx-auto sm:w-[92%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
