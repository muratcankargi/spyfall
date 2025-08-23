import React, { useState } from "react";
import { io } from "socket.io-client";

export default function GamePlay({ username, users, roomId, gameData }) {
    const [crossedWords, setCrossedWords] = useState([]);
      const [isOwner, setIsOwner] = useState(false);
    const socket = io("http://localhost:5001", {
        transports: ["websocket", "polling"],
    });
    const toggleWord = (word) => {
        setCrossedWords((prev) =>
            prev.includes(word)
                ? prev.filter((w) => w !== word)
                : [...prev, word]
        );
    };

    socket.on("roomOwner", (payload) => {
        setIsOwner(!!payload?.isOwner);
    });

    if (!gameData) return <div>Yükleniyor...</div>;
    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Sen {username === gameData.spy_username ? "Casussun" : "Normal Oyuncusun"}! </h2>
            <h2 className="text-xl font-bold mb-4">Senin kelimen : {username === gameData.spy_username ? gameData.spy_keyword : gameData.keyword}</h2>
 <div className="flex items-center gap-3">
          {isOwner && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Oyunu Başlat
            </button>
          )}

        </div>
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
