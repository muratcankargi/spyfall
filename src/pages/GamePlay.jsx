import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function GamePlay({ username, users, roomId, gameData, isOwner, onBackToRoom }) {
    const [crossedWords, setCrossedWords] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [voteData, setVoteData] = useState(null);
    const [myVote, setMyVote] = useState(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerError, setTimerError] = useState(null);
    const [gameResults, setGameResults] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const socketRef = useRef(null);
    const [timerDuration, setTimerDuration] = useState(480); // default 8 dakika

    const API_URL = process.env.REACT_APP_API_URL;

    useEffect(() => {
        socketRef.current = io(`${API_URL}`, {
            transports: ["websocket", "polling"],
        });

        const socket = socketRef.current;

        const handleTimerUpdate = (newTime) => {
            setTimeLeft(newTime);
        };

        const handleTimerEnded = () => {
            setTimeLeft(0);
            setTimerRunning(false);
            toast.info("Süre bitti!");
        };

        const handleTimerPaused = (currentTime) => {
            setTimerRunning(false);
            setTimeLeft(currentTime);
            toast.info("Timer durakladı");
        };

        const handleTimerResumed = (currentTime) => {
            setTimerRunning(true);
            setTimeLeft(currentTime);
            toast.info("Timer devam ediyor");
        };

        const handleTimerError = (error) => {
            console.error("Timer error:", error);
            setTimerError(error.message);
            toast.error(error.message);
        };

        const handleShowVote = (data) => {
            setVoteData(data);
            setMyVote(null);
        };

        const handleVoteResults = (results) => {
            setGameResults(results);
            setShowResults(true);
            setVoteData(null);
        };

        socket.on("timerUpdate", handleTimerUpdate);
        socket.on("timerEnded", handleTimerEnded);
        socket.on("timerPaused", handleTimerPaused);
        socket.on("timerResumed", handleTimerResumed);
        socket.on("timerError", handleTimerError);
        socket.on("showVote", handleShowVote);
        socket.on("voteResults", handleVoteResults);

        return () => {
            socket.off("timerUpdate", handleTimerUpdate);
            socket.off("timerEnded", handleTimerEnded);
            socket.off("timerPaused", handleTimerPaused);
            socket.off("timerResumed", handleTimerResumed);
            socket.off("timerError", handleTimerError);
            socket.off("showVote", handleShowVote);
            socket.off("voteResults", handleVoteResults);
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (socketRef.current && roomId && username) {
            socketRef.current.emit("joinRoom", { roomId, username });
        }
    }, [roomId, username]);

    const toggleWord = (word) => {
        setCrossedWords((prev) =>
            prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
        );
    };

    const startTimer = () => {
        if (!socketRef.current) {
            console.error("Socket not available");
            return;
        }

        setTimerRunning(true);
        setTimerError(null);
        socketRef.current.emit("startTimer", { roomId, duration: timerDuration, isOwner });
    };

    const pauseTimer = () => {
        if (!socketRef.current) {
            console.error("Socket not available");
            return;
        }
        socketRef.current.emit("pauseTimer", { roomId });
    };

    const resumeTimer = () => {
        if (!socketRef.current) {
            console.error("Socket not available");
            return;
        }
        socketRef.current.emit("resumeTimer", { roomId });
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const handleVote = (playerId, playerUsername) => {
        if (!socketRef.current) {
            console.error("Socket not available");
            return;
        }

        setMyVote(playerId);
        socketRef.current.emit("submitVote", {
            roomId,
            voter: username,
            voteFor: playerId
        });
        toast.success(`${playerUsername} için oy verildi!`);
        setVoteData(null);
    };

    const endGame = () => {
        if (!socketRef.current) {
            console.error("Socket not available");
            return;
        }

        toast.info(
            <div className="flex flex-col items-center">
                <p>Oyunu bitirmek istediğine emin misin?</p>
                <div className="mt-2 flex gap-2">
                    <button
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => {
                            socketRef.current.emit("endGame", { roomId });
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
    };

    const closeResults = () => {
        setShowResults(false);
        setGameResults(null);
        setVoteData(null);
        setMyVote(null);

        if (onBackToRoom) {
            onBackToRoom();
        }
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

    if (showResults && gameResults) {
        const voteCount = gameResults.voteCount || {};
        const mostVotedPlayer = Object.entries(voteCount).length > 0
            ? Object.entries(voteCount).reduce((a, b) => voteCount[a[0]] > voteCount[b[0]] ? a : b)[0]
            : null;

        const spyWon = mostVotedPlayer !== gameResults.spy_username;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto">
                    <div className="text-center">
                        {/* Oyun Sonucu Başlığı */}
                        <div className={`p-6 rounded-2xl mb-6 ${spyWon ? 'bg-red-50' : 'bg-green-50'}`}>
                            <h1 className={`text-3xl font-bold mb-2 ${spyWon ? 'text-red-700' : 'text-green-700'}`}>
                                {spyWon ? 'CASUS KAZANDI! 🕵️' : 'OYUNCULAR KAZANDI! 🎉'}
                            </h1>
                            <div className={`text-lg ${spyWon ? 'text-red-600' : 'text-green-600'}`}>
                                {spyWon ? 'Casus başarıyla kimliğini gizledi' : 'Casus yakalandı!'}
                            </div>
                        </div>

                        {/* Casus Kimliği */}
                        <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                            <h2 className="text-xl font-semibold mb-3 text-gray-800">Casus Kimliği</h2>
                            <div className="bg-red-100 text-red-700 p-4 rounded-xl font-bold text-lg">
                                🕵️ {gameResults.spy_username}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Kelimeler</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-100 p-4 rounded-xl">
                                    <h3 className="font-semibold text-green-800 mb-2">Normal Oyuncular</h3>
                                    <div className="text-green-700 font-bold text-lg">
                                        {gameResults.keyword}
                                    </div>
                                </div>
                                <div className="bg-red-100 p-4 rounded-xl">
                                    <h3 className="font-semibold text-red-800 mb-2">Casus</h3>
                                    <div className="text-red-700 font-bold text-lg">
                                        {gameResults.spy_keyword}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Oylama Sonuçları</h2>
                            {Object.keys(voteCount).length > 0 ? (
                                <div className="space-y-2">
                                    {Object.entries(voteCount)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([playerName, votes]) => (
                                            <div
                                                key={playerName}
                                                className={`flex justify-between items-center p-3 rounded-lg ${playerName === gameResults.spy_username ? 'bg-red-100' : 'bg-blue-50'
                                                    }`}
                                            >
                                                <span className="font-medium">
                                                    {playerName}
                                                    {playerName === gameResults.spy_username && ' 🕵️'}
                                                </span>
                                                <span className="font-bold text-lg">
                                                    {votes} oy
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">Oy verisi bulunamadı</div>
                            )}
                        </div>

                        {gameResults.votes && gameResults.votes.length > 0 && (
                            <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-800">Kim Kime Oy Verdi</h2>
                                <div className="space-y-2 text-sm">
                                    {gameResults.votes.map((vote, index) => (
                                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                                            <span className="font-medium">{vote.voter}</span>
                                            <span className="text-gray-500">→</span>
                                            <span className={`font-medium ${vote.votedFor === gameResults.spy_username ? 'text-red-600' : 'text-blue-600'}`}>
                                                {vote.votedFor}
                                                {vote.votedFor === gameResults.spy_username && ' 🕵️'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={closeResults}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-lg"
                        >
                            Odaya Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
            </header>

            <div className="bg-white rounded-2xl shadow p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">
                            Kalan Süre:
                            <span className={`ml-2 ${timeLeft <= 60 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </h3>
                        <div className={`w-3 h-3 rounded-full ${timerRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    </div>
                    {isOwner && (
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="number"
                                min="10"
                                value={timerDuration}
                                onChange={(e) => setTimerDuration(Number(e.target.value))}
                                className="w-24 px-2 py-1 border rounded"
                            />
                            <span className="text-gray-600 text-sm">saniye</span>
                        </div>
                    )}

                    {isOwner && (
                        <div className="flex gap-2">
                            <button
                                onClick={startTimer}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                disabled={timerRunning && timeLeft > 0}
                            >
                                Başlat
                            </button>
                            <button
                                onClick={pauseTimer}
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                                disabled={!timerRunning}
                            >
                                Duraklat
                            </button>
                            <button
                                onClick={resumeTimer}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                disabled={timerRunning}
                            >
                                Devam Et
                            </button>
                        </div>
                    )}
                </div>

                {timerError && (
                    <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
                        Hata: {timerError}
                    </div>
                )}
            </div>

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
                                            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 rounded font-medium transition"
                                            onClick={() => handleVote(p.id, p.username)}
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
                {/* Players Section */}
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

                    {isOwner && (
                        <div className="mt-6">
                            <button
                                onClick={endGame}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                                Oyunu Bitir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-8 text-sm text-gray-500 flex justify-between">
                <span>Oyuncu: {username}</span>
                <span>{isOwner ? "Oda Sahibi: Evet" : ""}</span>
            </footer>
        </div>
    );
}