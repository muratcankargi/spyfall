import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function GamePlay({ username, users, roomId, gameData, isOwner }) {
    const [crossedWords, setCrossedWords] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [voteData, setVoteData] = useState(null);
    const [myVote, setMyVote] = useState(null);
    const socket = io("http://localhost:5001", {
        transports: ["websocket", "polling"],
    });

    useEffect(() => {
        socket.on("timerUpdate", (newTime) => {
            setTimeLeft(newTime);
        });

        socket.on("timerEnded", () => {
            alert("Süre bitti!");
            setTimeLeft(0);
        });

        return () => {
            socket.off("timerUpdate");
            socket.off("timerEnded");
        };
    }, [socket]);
    useEffect(() => {
        socket.on("showVote", (data) => {
            setVoteData(data);
        });

        return () => {
            socket.off("showVote");
        };
    }, [socket]);

    const toggleWord = (word) => {
        setCrossedWords((prev) =>
            prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
        );
    };

    if (!gameData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-pulse text-gray-600">Yükleniyor...</div>
            </div>
        );
    }

    const isSpy = username === gameData.spy_username;
    const myKeyword = isSpy ? gameData.spy_keyword : gameData.keyword;


    const startTimer = () => {
        socket.emit("startTimer", { roomId, duration: 300 }); // 5 dk
    };

    const pauseTimer = () => {
        socket.emit("pauseTimer", { roomId });
    };

    const resumeTimer = () => {
        socket.emit("resumeTimer", { roomId });
    };

    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-md">
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                    Oda <span className="text-indigo-600">#{roomId}</span>
                </h1>
                <span
                    className={`px-3 py-1 text-sm rounded-full font-medium ${isSpy ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                >
                    {isSpy ? "Casus" : "Normal Oyuncu"}
                </span>
                {isOwner && (
                    <div className="mt-4">
                        <button
                            onClick={() => {
                                toast.info(
                                    <div className="flex flex-col items-center">
                                        <p>Oyunu bitirmek istediğine emin misin?</p>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                onClick={() => {
                                                    socket.emit("endGame", { roomId });
                                                    toast.dismiss();
                                                    toast.success("Oyun bitirildi, oyunculara anket gönderildi!");
                                                }}
                                            >
                                                Evet
                                            </button>
                                            <button
                                                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                                onClick={() => toast.dismiss()}
                                            >
                                                Hayır
                                            </button>
                                        </div>
                                    </div>,
                                    { autoClose: false }
                                );
                            }}
                            className="px-4 py-2 mt-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Oyunu Bitir
                        </button>
                    </div>
                )}

            </header>
{voteData && !myVote && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-2xl shadow-lg w-80 text-center">
      <h2 className="text-lg font-bold mb-4">Casus olduğunu düşündüğün kişiyi seç</h2>
      <ul className="space-y-2">
        {voteData.players
          .filter(p => p.username !== username) // kendini seçemez
          .map(p => (
            <li key={p.id}>
              <button
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 rounded font-medium"
                onClick={() => {
                  setMyVote(p.id);
                  socket.emit("submitVote", { roomId, voter: username, voteFor: p.id });
                }}
              >
                {p.username}
              </button>
            </li>
          ))}
      </ul>
    </div>
  </div>
)}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 bg-white rounded-2xl shadow p-4">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">
                        Oyuncular
                    </h2>
                    <Separator.Root className="bg-gray-200 h-px w-full mb-3" />

                    <ScrollArea.Root className="h-64 overflow-hidden">
                        <ScrollArea.Viewport className="h-full pr-3">
                            <ul className="space-y-3">
                                {users.map((player) => (
                                    <li
                                        key={player.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        <Avatar.Root className="w-10 h-10 rounded-full overflow-hidden border">
                                            {player.avatarUrl ? (
                                                <Avatar.Image
                                                    src={player.avatarUrl}
                                                    alt={player.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Avatar.Fallback className="flex items-center justify-center w-full h-full bg-indigo-100 text-indigo-600 font-bold">
                                                    {player.username.charAt(0).toUpperCase()}
                                                </Avatar.Fallback>
                                            )}
                                        </Avatar.Root>
                                        <span
                                            className={`font-medium ${player.username === username
                                                ? "text-indigo-600"
                                                : "text-gray-700"
                                                }`}
                                        >
                                            {player.username}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar
                            orientation="vertical"
                            className="w-2 bg-gray-200 rounded"
                        >
                            <ScrollArea.Thumb className="bg-indigo-400 rounded" />
                        </ScrollArea.Scrollbar>
                    </ScrollArea.Root>
                </div>
                <h3>Kalan Süre: {formatTime(timeLeft)}</h3>

                {isOwner && (
                    <div>
                        <button onClick={startTimer}>Başlat</button>
                        <button onClick={pauseTimer}>Duraklat</button>
                        <button onClick={resumeTimer}>Devam Et</button>
                    </div>
                )}
                <div className="col-span-2 bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">
                        Senin Kelimen
                    </h2>
                    <div
                        className={`p-4 rounded-xl text-center text-lg font-bold shadow ${isSpy
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                            }`}
                    >
                        {myKeyword}
                    </div>

                    <Separator.Root className="bg-gray-200 h-px w-full my-6" />

                    <h3 className="text-md font-semibold mb-3 text-gray-700">
                        Oyun Kelimeleri
                    </h3>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {gameData.words.map((w) => (
                            <li
                                key={w.name}
                                onClick={() => toggleWord(w.name)}
                                className={`p-3 rounded-xl text-center cursor-pointer select-none transition font-medium ${crossedWords.includes(w.name)
                                    ? "bg-gray-100 line-through text-gray-400"
                                    : "bg-indigo-50 hover:bg-indigo-100 text-gray-800"
                                    }`}
                            >
                                {w.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <footer className="mt-8 text-sm text-gray-500 flex justify-between">
                <span>Oyuncu: {username}</span>
                <span> {isOwner ? "Oda Sahibi: Evet" : ""}</span>
            </footer>
        </div>
    );
}