import React, { useState } from "react";

export default function GamePlay({ username, users, roomId, gameData }) {
    const [crossedWords, setCrossedWords] = useState([]);

    const toggleWord = (word) => {
        setCrossedWords((prev) =>
            prev.includes(word)
                ? prev.filter((w) => w !== word)
                : [...prev, word]
        );
    };

    if (!gameData) return <div>Yükleniyor...</div>;

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Oyun Başladı!</h2>
            <p>Sen {username === gameData.spy_id ? "Casussun" : "Oyuncusun"}</p>

            <ul className="space-y-2">
                {gameData.words.map((w) => (
                    <li
                        key={w.name}
                        onClick={() => toggleWord(w.name)}
                        className={`cursor-pointer ${crossedWords.includes(w.name) ? "line-through text-gray-400" : ""
                            }`}
                    >
                        {w.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}
