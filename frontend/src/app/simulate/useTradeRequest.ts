import { useCallback, useEffect, useRef, useState } from "react";

/** Keep an in-flight trade locked across a dismissed/reopened ticket, without reopening stale results. */
export function useTradeRequest(scope: string) {
	const mounted = useRef(true);
	const current = useRef({ scope, version: 0 });
	if (current.current.scope !== scope) current.current = { scope, version: current.current.version + 1 };
	const inFlight = useRef(false);
	const [pending, setPending] = useState(false);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const begin = useCallback(() => {
		if (inFlight.current) return null;
		inFlight.current = true;
		setPending(true);
		const version = current.current.version;
		let finished = false;
		return {
			isCurrent: () => mounted.current && current.current.version === version,
			finish: () => {
				if (finished) return;
				finished = true;
				inFlight.current = false;
				if (mounted.current) setPending(false);
			},
		};
	}, []);
	return { pending, begin };
}
