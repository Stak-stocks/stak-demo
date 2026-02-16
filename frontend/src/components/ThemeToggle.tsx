import { useState } from "react";
import { Monitor, Moon, Sun, Tv } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="fixed top-4 left-4 z-50 bg-[#0f1629]/80 dark:bg-[#0f1629]/80 hover:bg-[#162036] dark:hover:bg-[#162036] border border-slate-700/50 dark:border-slate-700/50"
				>
					<Tv className="w-5 h-5 text-zinc-400 dark:text-zinc-400" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-32">
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className={theme === "light" ? "bg-zinc-100 dark:bg-[#162036]" : ""}
				>
					<Sun className="w-4 h-4 mr-2" />
					Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className={theme === "dark" ? "bg-zinc-100 dark:bg-[#162036]" : ""}
				>
					<Moon className="w-4 h-4 mr-2" />
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className={theme === "system" ? "bg-zinc-100 dark:bg-[#162036]" : ""}
				>
					<Monitor className="w-4 h-4 mr-2" />
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
