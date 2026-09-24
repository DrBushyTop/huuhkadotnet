import {useEffect, useState} from 'react';
import {Dashboard} from '@/components/Dashboard';
import {ThemeToggle} from '@/components/ThemeToggle';
import {Dataset} from '@/lib/analytics';
import {BaselineData} from '@/lib/baseline';
import type {Sources} from '@/lib/combined';
import {loadReports} from '@/lib/load';

type Load = {state: 'loading'} | {state: 'error'; message: string} | {state: 'ready'; sources: Sources};

export function App() {
  const [load, setLoad] = useState<Load>({state: 'loading'});
  useEffect(() => {
    loadReports()
      .then(({report, baseline}) => setLoad({
        state: 'ready',
        sources: {data: new Dataset(report), baseline: baseline ? new BaselineData(baseline) : null},
      }))
      .catch((error: Error) => setLoad({state: 'error', message: error.message}));
  }, []);

  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">
        Skip to report
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3 text-[15px] font-semibold tracking-tight whitespace-nowrap">
            <span aria-hidden="true" className="text-[23px] font-bold tracking-tighter text-chart-second">h.</span>
            <span>huuhka.net</span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden font-medium text-muted-foreground sm:inline">Traffic archive</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline" href="/.auth/logout">Sign out</a>
          </div>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-[1240px] px-4 pt-2 pb-16 sm:px-8">
        {load.state === 'ready' ? <Dashboard sources={load.sources} /> : (
          <p role="status" className="py-16 text-muted-foreground">
            {load.state === 'loading' ? 'Loading archived traffic…' : `Could not load the traffic archive. ${load.message} Reload the page or sign in again.`}
          </p>
        )}
      </main>
    </>
  );
}
