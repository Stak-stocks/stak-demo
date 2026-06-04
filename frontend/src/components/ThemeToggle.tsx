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
					className="bg-transparent hover:bg-zinc-100 dark:hover:bg-surface-2 border border-zinc-200 dark:dark:border-slate-700/50 border-slate-200 rounded-lg"
				>
					<Tv className="w-5 h-5 text-zinc-500 dark:dark:text-zinc-400 text-zinc-600" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-32">
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className={theme === "light" ? "bg-zinc-100 dark:bg-surface-2" : ""}
				>
					<Sun className="w-4 h-4 mr-2" />
					Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className={theme === "dark" ? "bg-zinc-100 dark:bg-surface-2" : ""}
				>
					<Moon className="w-4 h-4 mr-2" />
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className={theme === "system" ? "bg-zinc-100 dark:bg-surface-2" : ""}
				>
					<Monitor className="w-4 h-4 mr-2" />
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
