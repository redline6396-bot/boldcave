export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <section className="mx-auto hidden max-w-[1280px] px-4 pb-4 pt-7 sm:block sm:px-6 sm:pt-8 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 bg-neutral-100" />
          <div className="h-3 w-2 bg-neutral-100" />
          <div className="h-3 w-20 bg-neutral-100" />
          <div className="h-3 w-2 bg-neutral-100" />
          <div className="h-3 w-28 bg-neutral-100" />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-5 px-5 pb-10 pt-6 min-[600px]:max-w-[760px] min-[600px]:px-6 min-[600px]:pb-14 min-[600px]:pt-2 min-[820px]:max-w-[1180px] min-[820px]:grid-cols-[minmax(0,1fr)_minmax(260px,0.92fr)] min-[820px]:items-start min-[820px]:gap-5 lg:grid-cols-[minmax(0,600px)_minmax(360px,460px)] lg:gap-10 lg:px-8 lg:pb-14 xl:gap-14">
        <div className="min-w-0 min-[820px]:sticky min-[820px]:top-[92px] lg:top-[104px]">
          <div className="aspect-square w-full border border-[#eeeeee] bg-neutral-50 lg:h-[min(600px,calc(100vh-210px))] lg:min-h-[500px] lg:aspect-auto lg:border-0" />
          <div className="mx-auto mt-4 grid w-full max-w-[380px] grid-cols-3 gap-2.5 min-[600px]:max-w-[520px] min-[820px]:hidden lg:hidden">
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
          </div>
          <div className="mt-4 hidden grid-cols-4 gap-2 min-[900px]:gap-2.5 sm:gap-3 lg:grid">
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
            <div className="aspect-square border border-neutral-200 bg-neutral-50" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[360px] min-w-0 bg-white pt-0 min-[600px]:max-w-[560px] min-[600px]:pt-2 min-[820px]:mx-0 min-[820px]:max-w-none min-[820px]:pt-1 lg:w-full lg:max-w-[460px] lg:justify-self-start">
          <div className="h-3 w-24 bg-neutral-100" />
          <div className="mt-3 h-10 w-3/4 bg-neutral-100 min-[600px]:h-11 lg:h-12" />
          <div className="mt-3 h-5 w-32 bg-neutral-100" />
          <div className="mt-4 h-16 max-w-[315px] bg-neutral-100 min-[600px]:max-w-[520px] min-[820px]:max-w-[300px]" />
          <div className="mt-4 h-8 w-32 bg-neutral-100" />
          <div className="mt-4 border-t border-[#e8e2d9] pt-3.5 sm:pt-4">
            <div className="h-4 w-24 bg-neutral-100" />
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="h-9 w-[94px] border border-neutral-200 bg-neutral-50 min-[600px]:h-11 min-[600px]:w-[126px] min-[820px]:h-10 min-[820px]:w-[108px]" />
              <div className="h-9 w-[94px] border border-neutral-200 bg-neutral-50 min-[600px]:h-11 min-[600px]:w-[126px] min-[820px]:h-10 min-[820px]:w-[108px]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-4 w-20 bg-neutral-100" />
            <div className="mt-2 h-9 w-[112px] border border-neutral-200 bg-neutral-50 min-[600px]:h-11 min-[600px]:w-[152px] min-[820px]:h-10 min-[820px]:w-[134px]" />
          </div>
          <div className="mt-4 grid w-full max-w-[360px] gap-2 min-[600px]:max-w-[520px] min-[820px]:max-w-[320px] lg:max-w-[390px]">
            <div className="h-10 border border-neutral-200 bg-neutral-50 min-[600px]:h-12 min-[820px]:h-10 lg:h-[46px]" />
            <div className="h-10 border border-neutral-200 bg-neutral-100 min-[600px]:h-12 min-[820px]:h-10 lg:h-[46px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
