import { Moon, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ThemeToggleProps {
	compact?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
	const [darkMode, setDarkMode] = useState(false);

	useEffect(() => {
		// Check for user preference
		const isDark =
			localStorage.getItem("darkMode") === "true" ||
			window.matchMedia("(prefers-color-scheme: dark)").matches;

		setDarkMode(isDark);
		updateTheme(isDark);
	}, []);

	const toggleTheme = () => {
		const newMode = !darkMode;
		setDarkMode(newMode);
		updateTheme(newMode);
		localStorage.setItem("darkMode", String(newMode));
	};

	const updateTheme = (isDark: boolean) => {
		if (isDark) {
			// document.documentElement.classList.add("dark");
		} else {
			// document.documentElement.classList.remove("dark");
		}
	};

	return (
		<button
			onClick={toggleTheme}
			className={`flex items-center ${
				compact
					? "justify-center w-8 h-8 rounded-full"
					: "px-3 py-2 rounded-md"
			} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200`}
			aria-label="Toggle dark mode"
		>
			{darkMode ? (
				<>
					<Sun className="h-5 w-5 text-amber-500" />
					{!compact && (
						<span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
							Light
						</span>
					)}
				</>
			) : (
				<>
					<Moon className="h-5 w-5 text-indigo-600" />
					{!compact && (
						<span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">
							Dark
						</span>
					)}
				</>
			)}
		</button>
	);
};

export default ThemeToggle;
