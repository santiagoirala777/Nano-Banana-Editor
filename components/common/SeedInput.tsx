
import React from 'react';
import { Button } from './Button';

interface SeedInputProps {
    seed: string;
    setSeed: (seed: string) => void;
    isLocked: boolean;
    setIsLocked: (isLocked: boolean) => void;
}

export const SeedInput: React.FC<SeedInputProps> = ({ seed, setSeed, isLocked, setIsLocked }) => {
    const randomizeSeed = () => {
        if (!isLocked) {
            setSeed(Math.floor(Math.random() * 1000000).toString());
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Seed</label>
            <div className="flex items-center space-x-2">
                <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    disabled={isLocked}
                />
                <Button variant="icon" onClick={randomizeSeed} disabled={isLocked} aria-label="Randomize seed">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                </Button>
                <Button variant="icon" isActive={isLocked} onClick={() => setIsLocked(!isLocked)} aria-label={isLocked ? "Unlock seed" : "Lock seed"}>
                    {isLocked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 9a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                    )}
                </Button>
            </div>
        </div>
    );
}