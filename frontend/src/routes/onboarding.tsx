import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/app/auth/ui";
import { BackControl, HeroBox, OnboardingChrome, StepHeading } from "@/app/onboarding/Chrome";
import { GOAL_ICONS, OptionMatrix, RISK_ICONS } from "@/app/onboarding/OptionMatrix";
import { SwipeCards } from "@/app/onboarding/SwipeCards";
import {
	BRANDS,
	type BrandPick,
	DEFAULT_BRAND_PICKS,
	DEFAULT_GOAL,
	DEFAULT_RISK,
	GOALS,
	PROFILE_DEFAULT_NAME,
	PROFILE_NAME_MAX,
	RISK_STYLE,
	RISKS,
	TASTE_BARS,
} from "@/app/onboarding/data";
import { useAccount } from "@/context/AccountContext";
import { trackEvent, updateProfile } from "@/lib/api";
import { logEvent } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

type OnboardingSearch = { step: number; hold?: boolean; preview?: boolean };

const flag = (v: unknown) => (v === true || v === 1 || v === "1" ? true : undefined);

export const Route = createFileRoute("/onboarding")({
	validateSearch: (search: Record<string, unknown>): OnboardingSearch => {
		const n = Number(search.step);
		return {
			step: Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1,
			// hold=1 freezes the Preparing-deck step (no auto-advance), preview=1 skips the sign-in guards
			hold: flag(search.hold),
			preview: flag(search.preview),
		};
	},
	component: OnboardingPage,
});

/**
 * Figma 01 · Onboarding, steps 1-8 (2:5710 … 2:6271), driven by ?step=. The completion writes of the
 * previous onboarding page (preferences, deck reset, onboardingCompleted + claim refresh) run once
 * on the Preparing-deck step, exactly where the old flow ran them.
 */
function OnboardingPage() {
	const { step, hold, preview } = Route.useSearch();
	const { user, loading, onboardingCompleted: claimsOnboardingCompleted, refreshClaims } = useAuth();
	const { account, accountLoading, updatePreferences, updateDeckOrder, updateLastBriefDate } = useAccount();
	const navigate = useNavigate();
	const hasProgressed = useRef(false);
	const completed = useRef(false);

	const [picks, setPicks] = useState<string[]>(DEFAULT_BRAND_PICKS);
	const [goal, setGoal] = useState<string>(DEFAULT_GOAL);
	const [risk, setRisk] = useState<string>(DEFAULT_RISK);
	const [name, setName] = useState(PROFILE_DEFAULT_NAME);

	const goTo = useCallback(
		(next: number) => {
			hasProgressed.current = true;
			navigate({ to: "/onboarding", search: { step: next } });
		},
		[navigate],
	);
	const back = useCallback(() => {
		// prototype: Back on the Taste reveal returns to the Risk matrix, skipping the Preparing step
		if (step === 7) goTo(5);
		else if (step > 1) goTo(step - 1);
		else navigate({ to: "/login" });
	}, [step, goTo, navigate]);

	// Guards from the previous onboarding page: no session -> sign in; already onboarded -> home.
	useEffect(() => {
		if (preview || loading) return;
		if (!user) navigate({ to: "/login" });
	}, [preview, user, loading, navigate]);
	useEffect(() => {
		if (preview || loading || !user || hasProgressed.current) return;
		if (claimsOnboardingCompleted) navigate({ to: "/home", replace: true });
	}, [preview, loading, user, claimsOnboardingCompleted, navigate]);
	useEffect(() => {
		if (preview || loading || accountLoading || !user || hasProgressed.current) return;
		if (account?.onboardingCompleted === true) navigate({ to: "/home", replace: true });
	}, [preview, loading, accountLoading, user, account, navigate]);

	// Step 6 · Preparing deck: persist the answers, mark onboarding complete, then move on.
	const [filling, setFilling] = useState(false);
	useEffect(() => {
		if (step !== 6) return;
		if (!completed.current && user && !preview) {
			completed.current = true;
			sessionStorage.removeItem("stak-deck-order");
			const prefs = { interests: [] as string[], familiarity: risk, onboardingSwipes: picks };
			updatePreferences(prefs).catch(() => {});
			updateDeckOrder([]).catch(() => {});
			const d = new Date();
			updateLastBriefDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`).catch(
				() => {},
			);
			updateProfile({ onboardingCompleted: true, preferences: prefs })
				.then(() => refreshClaims())
				.catch((err) => {
					console.warn("[onboarding] updateProfile failed:", err);
				});
			logEvent("onboarding_complete", { brands: picks, goal, risk });
			trackEvent("onboarding_complete", { brands: picks, goal, risk }).catch(() => {});
		}
		if (hold) return;
		const start = requestAnimationFrame(() => setFilling(true));
		const t = setTimeout(() => goTo(7), 1800);
		return () => {
			cancelAnimationFrame(start);
			clearTimeout(t);
		};
	}, [step, hold, user, preview, picks, goal, risk, goTo, refreshClaims, updatePreferences, updateDeckOrder, updateLastBriefDate]);

	const togglePick = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

	return (
		<div className="relative min-h-[1024px] w-full overflow-clip bg-[#0a1020] font-geist antialiased">
			{step === 1 && (
				<>
					<BackControl className="absolute left-[60px] top-[96px]" onClick={back} />
					<div className="absolute left-[calc(50%+0.5px)] top-[calc(50%-0.4px)] flex w-[633px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[48px]">
						<HeroBox />
						<div className="flex w-full flex-col items-center gap-[70px]">
							<div className="flex w-full flex-col items-center gap-[14px] overflow-clip">
								<h1 className="whitespace-nowrap font-sora text-[34px] font-semibold leading-[43px] text-[#f2f6fc]">
									Find stocks you actually understand.
								</h1>
								<p className="w-[620px] text-center font-geist text-[15px] leading-[20px] text-[#819abb]">
									STAK turns brands you already know into simple, clear stock ideas, so you can invest with confidence.
								</p>
							</div>
							<div className="flex w-[440px] flex-col items-center gap-[17px]">
								<PrimaryButton onClick={() => goTo(2)}>Get started</PrimaryButton>
								<p className="w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">Takes about a minute</p>
							</div>
						</div>
					</div>
				</>
			)}

			{step === 2 && (
				<>
					<OnboardingChrome label="STEP 2 OF 6" logoText="picks" progress={2} onBack={back} />
					<StepHeading
						className="absolute left-1/2 top-[170px] -translate-x-1/2"
						title="Which brands do you know or use?"
						subtitle="Pick a few. STAK uses this to learn what feels familiar to you."
					/>
					<div className="absolute left-[240px] top-[320px] flex w-[960px] flex-col items-center gap-[90px]">
						<div className="relative h-[268px] w-full overflow-clip">
							{BRANDS.map((b, i) => (
								<BrandCard key={b.id} brand={b} selected={picks.includes(b.id)} onToggle={() => togglePick(b.id)} index={i} />
							))}
						</div>
						<div className="flex w-[440px] flex-col items-center gap-[17px]">
							<PrimaryButton onClick={() => goTo(3)}>{`Continue · ${picks.length} picked`}</PrimaryButton>
							<p className="w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">You can change this later</p>
						</div>
					</div>
				</>
			)}

			{step === 3 && (
				<>
					<OnboardingChrome label="STEP 3 OF 6" logoText="picks" progress={3} onBack={back} />
					<StepHeading
						className="absolute left-1/2 top-[170px] -translate-x-1/2"
						title="Now try a few swipes."
						subtitle="Use ← → keys or click. Save what you like."
					/>
					<div className="absolute left-[500px] top-[283px] flex w-[440px] flex-col items-center gap-[70px]">
						<SwipeCards />
						<PrimaryButton onClick={() => goTo(4)}>Continue</PrimaryButton>
					</div>
				</>
			)}

			{step === 4 && (
				<>
					<OnboardingChrome label="STEP 4 OF 6" logoText="goal" progress={4} onBack={back} />
					<div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[776px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[84px]">
						<StepHeading title="What brings you here?" subtitle="Pick one. You can change it any time." />
						<div className="flex w-full flex-col items-center gap-[70px]">
							<OptionMatrix options={GOALS} icons={GOAL_ICONS} selected={goal} onSelect={setGoal} wideFirst />
							<PrimaryButton className="w-[440px]" onClick={() => goTo(5)}>
								Continue
							</PrimaryButton>
						</div>
					</div>
				</>
			)}

			{step === 5 && (
				<>
					<OnboardingChrome label="STEP 5 OF 6" logoText="picks" progress={5} onBack={back} />
					<div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[776px] -translate-x-1/2 -translate-y-1/2 flex-col items-end gap-[84px]">
						<StepHeading
							title="A stock you’re watching drops 10% overnight."
							subtitle="No wrong answer. This helps STAK understand your risk style."
						/>
						<div className="flex w-full flex-col items-center">
							<div className="flex w-full flex-col items-center gap-[70px]">
								<OptionMatrix options={RISKS} icons={RISK_ICONS} selected={risk} onSelect={setRisk} />
								<PrimaryButton className="w-[440px]" onClick={() => goTo(6)}>
									Continue
								</PrimaryButton>
							</div>
						</div>
					</div>
				</>
			)}

			{step === 6 && (
				<div className="absolute left-1/2 top-[calc(50%+0.1px)] flex w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[48px]">
					<HeroBox />
					<div className="flex w-full flex-col items-center gap-[54px]">
						<StepHeading title="Building your first deck..." subtitle="Reading your brand picks" />
						<div className="relative h-[6px] w-full overflow-clip rounded-[3px] bg-[#12203e]">
							<div
								className="absolute left-0 top-0 h-[6px] rounded-[3px] bg-[#5da8bf] transition-[width] duration-[2200ms] ease-linear"
								style={{ width: filling && !hold ? 420 : 260 }}
							/>
						</div>
					</div>
				</div>
			)}

			{step === 7 && (
				<>
					<OnboardingChrome label="STEP 6 OF 6" logoText="taste" progress={6} onBack={back} />
					<p className="absolute left-[640px] top-[632px] whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">
						Your deck adjusts as you swipe.
					</p>
					<div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[700px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[70px]">
						<div className="flex w-full flex-col items-center gap-[64px]">
							<div className="flex w-full flex-col items-center gap-[8px]">
								<p className="w-full text-center font-geist text-[11px] font-medium leading-[14px] tracking-[0.88px] text-[#819abb]">
									YOUR STARTING STAK TASTE
								</p>
								<div className="flex w-full flex-col items-center gap-[10px] overflow-clip">
									<h1 className="whitespace-nowrap font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc]">Here’s what you’re into.</h1>
									<p className="w-[700px] text-center font-geist text-[14px] leading-[18px] text-[#819abb]">
										Built from your picks. It gets smarter with every swipe.
									</p>
								</div>
							</div>
							<div className="flex w-[640px] flex-col items-start gap-[14px]">
								<div className="flex w-full flex-col items-start gap-[14px] overflow-clip rounded-[16px] bg-[#181f30] px-[24px] py-[22px]">
									{TASTE_BARS.map((bar) => (
										<div key={bar.label} className="flex h-[40px] w-full flex-col items-start gap-[6px] overflow-clip">
											<div className="flex h-[18px] w-full items-start justify-between overflow-clip whitespace-nowrap">
												<span className="font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{bar.label}</span>
												<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{bar.level}</span>
											</div>
											<div className="relative h-[6px] w-full overflow-clip rounded-[3px] bg-[#12203e]">
												<div className="absolute left-0 top-0 h-[6px] rounded-[3px] bg-[#5da8bf]" style={{ width: bar.width }} />
											</div>
										</div>
									))}
								</div>
								<div className="flex h-[60px] w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[16px] bg-[#181f30] px-[24px] py-[16px]">
									<div className="flex flex-col items-start gap-[2px] overflow-clip">
										<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">Risk style</span>
										<span className="font-geist text-[14px] font-medium leading-[18px] text-[#f2f6fc]">{RISK_STYLE}</span>
									</div>
									<span className="font-geist text-[15px] font-medium leading-[20px] text-[#819abb]">›</span>
								</div>
							</div>
						</div>
						<PrimaryButton className="w-[440px]" onClick={() => goTo(8)}>
							Lets go!
						</PrimaryButton>
					</div>
				</>
			)}

			{step === 8 && (
				<>
					<OnboardingChrome label="STEP · LAST ONE" logoText="profile" onBack={back} />
					<div className="absolute left-1/2 top-[calc(50%+0.5px)] flex w-[700px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[70px]">
						<div className="flex w-full flex-col items-center gap-[53px]">
							<div className="flex w-full flex-col items-center gap-[10px] overflow-clip">
								<h1 className="whitespace-nowrap font-sora text-[30px] font-semibold leading-[38px] text-[#f2f6fc]">Make it yours</h1>
								<p className="w-[700px] text-center font-geist text-[14px] leading-[18px] text-[#819abb]">
									Pick a name and photo. This is how you’ll show up on leaderboards.
								</p>
							</div>
							<div className="flex w-[120px] flex-col items-center gap-[18px]">
								<div className="flex h-[120px] w-full items-center justify-center overflow-clip rounded-[60px] bg-[#181f30]">
									<span className="whitespace-nowrap font-sora text-[44px] font-semibold leading-[55px] text-[#f2f6fc]">
										{(name.trim()[0] ?? "N").toUpperCase()}
									</span>
								</div>
								<button type="button" className="w-full text-center font-geist text-[12px] font-medium leading-[16px] text-[#a6e4f7]">
									Add a photo
								</button>
							</div>
							<div className="flex w-[440px] flex-col items-center gap-[18px]">
								<div className="flex w-full flex-col items-start gap-[9px]">
									<label htmlFor="display-name" className="w-full font-geist text-[10px] font-medium leading-[13px] tracking-[0.8px] text-[#819abb]">
										DISPLAY NAME
									</label>
									<div className="flex h-[48px] w-full items-center justify-between overflow-clip whitespace-nowrap rounded-[12px] bg-[#181f30] px-[16px]">
										<input
											id="display-name"
											value={name}
											maxLength={PROFILE_NAME_MAX}
											onChange={(e) => setName(e.target.value)}
											className="min-w-0 flex-1 bg-transparent font-geist text-[14px] font-medium leading-[18px] text-[#f2f6fc] outline-none"
										/>
										<span className="font-geist text-[11px] leading-[14px] text-[#819abb]">{`${name.length} / ${PROFILE_NAME_MAX}`}</span>
									</div>
								</div>
								<p className="w-full text-center font-geist text-[11px] leading-[14px] text-[#819abb]">You can change this anytime in Profile.</p>
							</div>
						</div>
						<PrimaryButton className="w-[440px]" onClick={() => navigate({ to: "/home", search: { firstRun: true }, replace: true })}>
							Proceed to home
						</PrimaryButton>
					</div>
				</>
			)}
		</div>
	);
}

/** "Brand · Apple" card (225x76): white 24px badge with the logo, name in accent when picked. */
function BrandCard({ brand, selected, onToggle, index }: { brand: BrandPick; selected: boolean; onToggle: () => void; index: number }) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onToggle}
			className={cn(
				"absolute flex h-[76px] w-[225px] items-center justify-center gap-[10px] overflow-clip rounded-[14px] bg-[#181f30]",
				selected && "border border-solid border-[rgba(105,179,202,0.5)]",
			)}
			style={{ left: (index % 4) * 245, top: Math.floor(index / 4) * 96 }}
		>
			<span className="flex size-[24px] shrink-0 items-center justify-center overflow-clip rounded-[12px] bg-white">
				<img
					alt=""
					src={brand.logo}
					className="object-contain"
					style={{ width: brand.logoSize, height: brand.logoHeight ?? brand.logoSize, borderRadius: brand.logoRadius }}
				/>
			</span>
			<span className={cn("whitespace-nowrap font-geist text-[14px] font-medium leading-[18px]", selected ? "text-[#a6e4f7]" : "text-[#f2f6fc]")}>
				{brand.name}
			</span>
		</button>
	);
}
