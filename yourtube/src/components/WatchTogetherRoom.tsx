"use client";

import { useUser } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import {
  WATCH_TOGETHER_ICE_SERVERS,
  buildRecordingFilename,
  getSupportedRecordingMimeType,
  normalizeYouTubeUrl,
} from "@/lib/watchTogether";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Copy,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Radio,
  Save,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type RoomPhase =
  | "idle"
  | "creating"
  | "ready"
  | "joining"
  | "connected"
  | "ended";

type RoomDoc = {
  answer?: RTCSessionDescriptionInit;
  createdAt?: unknown;
  createdBy?: string;
  inviteLabel?: string;
  joinedLabel?: string;
  offer?: RTCSessionDescriptionInit;
  sharedVideoUrl?: string;
  status?: string;
};

const canvasWidth = 1280;
const canvasHeight = 720;

type WatchTogetherRoomProps = {
  initialRoomId?: string;
};

const WatchTogetherRoom = ({ initialRoomId = "" }: WatchTogetherRoomProps) => {
  const { user, handlegooglesignin } = useUser();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPhase, setRoomPhase] = useState<RoomPhase>("idle");
  const [joinLabel, setJoinLabel] = useState("");
  const [sharedUrlInput, setSharedUrlInput] = useState("");
  const [sharedVideoUrl, setSharedVideoUrl] = useState("");
  const [statusText, setStatusText] = useState("Start a private room and invite a friend.");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const roomUnsubscribeRef = useRef<(() => void) | null>(null);
  const candidateUnsubscribesRef = useRef<Array<() => void>>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenAudioSenderRef = useRef<RTCRtpSender | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drawingFrameRef = useRef<number | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);

  const inviteLink = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}/watch-together?room=${roomId}`;
  }, [roomId]);

  const ensureSignedIn = () => {
    if (user) return true;
    toast.info("Sign in with Google to start or join a call.");
    handlegooglesignin();
    return false;
  };

  const attachStream = (element: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!element) return;
    element.srcObject = stream;
  };

  const clearSubscriptions = () => {
    roomUnsubscribeRef.current?.();
    roomUnsubscribeRef.current = null;
    candidateUnsubscribesRef.current.forEach((unsubscribe) => unsubscribe());
    candidateUnsubscribesRef.current = [];
  };

  const stopTrackGroup = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const releaseRecordingResources = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current);
      drawingFrameRef.current = null;
    }

    stopTrackGroup(recordingStreamRef.current);
    recordingStreamRef.current = null;
    recordingAudioContextRef.current?.close().catch(() => undefined);
    recordingAudioContextRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const resetCallState = () => {
    clearSubscriptions();
    releaseRecordingResources();

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    videoSenderRef.current = null;
    screenAudioSenderRef.current = null;

    stopTrackGroup(localStreamRef.current);
    stopTrackGroup(remoteStreamRef.current);
    stopTrackGroup(screenStreamRef.current);

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    screenStreamRef.current = null;

    setIsScreenSharing(false);

    attachStream(localVideoRef.current, null);
    attachStream(remoteVideoRef.current, null);
    attachStream(screenPreviewRef.current, null);
  };

  const syncSharedVideo = async (nextUrl: string) => {
    if (!roomId) return;

    const normalized = normalizeYouTubeUrl(nextUrl);
    if (!normalized) {
      toast.error("Paste a valid YouTube link or 11-character YouTube video ID.");
      return;
    }

    await updateDoc(doc(db, "watchTogetherRooms", roomId), {
      sharedVideoUrl: normalized,
      sharedVideoUpdatedAt: serverTimestamp(),
    });

    setSharedUrlInput(normalized);
    toast.success("Shared YouTube link updated for everyone in the room.");
  };

  const setupPeerConnection = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });

    const remoteStream = new MediaStream();
    const peerConnection = new RTCPeerConnection({
      iceServers: WATCH_TOGETHER_ICE_SERVERS,
    });

    localStream.getTracks().forEach((track) => {
      const sender = peerConnection.addTrack(track, localStream);
      if (track.kind === "video") {
        videoSenderRef.current = sender;
      }
    });

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        const alreadyPresent = remoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!alreadyPresent) {
          remoteStream.addTrack(track);
        }
      });

      remoteStreamRef.current = remoteStream;
      attachStream(remoteVideoRef.current, remoteStream);
    };

    peerConnection.onconnectionstatechange = () => {
      const connectionState = peerConnection.connectionState;

      if (connectionState === "connected") {
        setRoomPhase("connected");
        setStatusText("Live call connected. You can talk, share a YouTube tab, and record locally.");
      }

      if (connectionState === "failed" || connectionState === "disconnected") {
        setStatusText("Connection dropped. You can hang up and rejoin the room.");
      }
    };

    localStreamRef.current = localStream;
    remoteStreamRef.current = remoteStream;
    peerConnectionRef.current = peerConnection;

    attachStream(localVideoRef.current, localStream);
    attachStream(remoteVideoRef.current, remoteStream);

    return peerConnection;
  };

  const watchRoomDocument = (activeRoomId: string) => {
    clearSubscriptions();

    const roomRef = doc(db, "watchTogetherRooms", activeRoomId);
    roomUnsubscribeRef.current = onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data() as RoomDoc | undefined;
      if (!data) return;

      if (data.sharedVideoUrl) {
        setSharedVideoUrl(data.sharedVideoUrl);
        setSharedUrlInput((currentValue) => currentValue || data.sharedVideoUrl || "");
      }

      if (data.joinedLabel) {
        setJoinLabel(data.joinedLabel);
      }

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;

      if (data.answer && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.status === "ended" && roomPhase !== "ended") {
        setRoomPhase("ended");
        setStatusText("The call was ended from the other side.");
        resetCallState();
      }
    });
  };

  const subscribeToCandidates = (activeRoomId: string, collectionName: "callerCandidates" | "calleeCandidates") => {
    const candidatesRef = collection(db, "watchTogetherRooms", activeRoomId, collectionName);
    const unsubscribe = onSnapshot(candidatesRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== "added") return;
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;
        await peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    candidateUnsubscribesRef.current.push(unsubscribe);
  };

  const handleCreateRoom = async () => {
    if (!ensureSignedIn()) return;

    try {
      resetCallState();
      setRoomPhase("creating");
      setStatusText("Opening camera and microphone...");

      const peerConnection = await setupPeerConnection();
      const roomRef = doc(collection(db, "watchTogetherRooms"));

      setRoomId(roomRef.id);
      setRoomIdInput(roomRef.id);

      peerConnection.onicecandidate = async (event) => {
        if (!event.candidate) return;
        await addDoc(collection(roomRef, "callerCandidates"), event.candidate.toJSON());
      };

      const inviteLabel = user?.name || user?.email || "YourTube user";
      await setDoc(roomRef, {
        createdAt: serverTimestamp(),
        createdBy: user?._id || user?.email || "anonymous",
        inviteLabel,
        sharedVideoUrl: "",
        status: "waiting",
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await updateDoc(roomRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      watchRoomDocument(roomRef.id);
      subscribeToCandidates(roomRef.id, "calleeCandidates");

      setRoomPhase("ready");
      setStatusText("Room is ready. Share the room code or invite link with your friend.");
      toast.success("Watch Together room created.");
    } catch (error) {
      console.error(error);
      resetCallState();
      setRoomPhase("idle");
      setStatusText("We couldn't create the room. Check camera/mic permissions and try again.");
      toast.error("Unable to create the room.");
    }
  };

  const handleJoinRoom = async () => {
    if (!ensureSignedIn()) return;

    const nextRoomId = roomIdInput.trim();
    if (!nextRoomId) {
      toast.error("Enter a room code to join.");
      return;
    }

    try {
      resetCallState();
      setRoomPhase("joining");
      setStatusText("Joining room and negotiating connection...");

      const roomRef = doc(db, "watchTogetherRooms", nextRoomId);
      const roomSnapshot = await getDoc(roomRef);

      if (!roomSnapshot.exists()) {
        throw new Error("Room not found");
      }

      const roomData = roomSnapshot.data() as RoomDoc;
      if (!roomData.offer) {
        throw new Error("Room offer missing");
      }

      const peerConnection = await setupPeerConnection();

      peerConnection.onicecandidate = async (event) => {
        if (!event.candidate) return;
        await addDoc(collection(roomRef, "calleeCandidates"), event.candidate.toJSON());
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        joinedAt: serverTimestamp(),
        joinedBy: user?._id || user?.email || "anonymous",
        joinedLabel: user?.name || user?.email || "YourTube user",
        status: "connected",
      });

      setRoomId(nextRoomId);
      setJoinLabel(roomData.inviteLabel || "Friend");
      setSharedVideoUrl(roomData.sharedVideoUrl || "");
      setSharedUrlInput(roomData.sharedVideoUrl || "");

      watchRoomDocument(nextRoomId);
      subscribeToCandidates(nextRoomId, "callerCandidates");

      setRoomPhase("connected");
      setStatusText("Connected. Ask your friend to share a YouTube tab when you're ready to watch together.");
      toast.success("Joined the Watch Together room.");
    } catch (error) {
      console.error(error);
      resetCallState();
      setRoomPhase("idle");
      setStatusText("We couldn't join that room. Double-check the code and browser permissions.");
      toast.error("Unable to join the room.");
    }
  };

  const handleCopy = async (value: string, successMessage: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Clipboard access was blocked.");
    }
  };

  const handleStartScreenShare = async () => {
    const peerConnection = peerConnectionRef.current;
    const localStream = localStreamRef.current;

    if (!peerConnection || !localStream || !videoSenderRef.current) {
      toast.error("Start or join a room before sharing your screen.");
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: true,
      });

      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (!screenVideoTrack) {
        throw new Error("No screen video track returned");
      }

      await videoSenderRef.current.replaceTrack(screenVideoTrack);

      const screenAudioTrack = screenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        screenAudioSenderRef.current = peerConnection.addTrack(screenAudioTrack, screenStream);
      }

      screenVideoTrack.onended = () => {
        void handleStopScreenShare();
      };

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      attachStream(screenPreviewRef.current, screenStream);
      setStatusText("Screen share live. Choose the YouTube browser tab in the picker for shared viewing.");
      toast.success("Screen sharing started.");
    } catch (error) {
      console.error(error);
      toast.error("Screen sharing was cancelled or blocked by the browser.");
    }
  };

  const handleStopScreenShare = async () => {
    const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (localVideoTrack && videoSenderRef.current) {
      await videoSenderRef.current.replaceTrack(localVideoTrack);
    }

    if (screenAudioSenderRef.current && peerConnectionRef.current) {
      peerConnectionRef.current.removeTrack(screenAudioSenderRef.current);
      screenAudioSenderRef.current = null;
    }

    stopTrackGroup(screenStreamRef.current);
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    attachStream(screenPreviewRef.current, null);
    setStatusText("Returned to camera video. You can start screen sharing again anytime.");
  };

  const buildCompositeRecordingStream = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas capture is unavailable");
    }

    const drawLoop = () => {
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      const mainSource =
        (screenPreviewRef.current?.srcObject ? screenPreviewRef.current : null) ||
        (remoteVideoRef.current?.srcObject ? remoteVideoRef.current : null) ||
        localVideoRef.current;

      if (mainSource && mainSource.readyState >= 2) {
        context.drawImage(mainSource, 0, 0, canvasWidth, canvasHeight);
      }

      const insetWidth = 300;
      const insetHeight = 170;

      if (remoteVideoRef.current && remoteVideoRef.current.readyState >= 2 && mainSource !== remoteVideoRef.current) {
        context.fillStyle = "rgba(15, 23, 42, 0.85)";
        context.fillRect(24, 24, insetWidth, insetHeight);
        context.drawImage(remoteVideoRef.current, 24, 24, insetWidth, insetHeight);
      }

      if (localVideoRef.current && localVideoRef.current.readyState >= 2 && mainSource !== localVideoRef.current) {
        context.fillStyle = "rgba(15, 23, 42, 0.85)";
        context.fillRect(canvasWidth - insetWidth - 24, canvasHeight - insetHeight - 24, insetWidth, insetHeight);
        context.drawImage(
          localVideoRef.current,
          canvasWidth - insetWidth - 24,
          canvasHeight - insetHeight - 24,
          insetWidth,
          insetHeight
        );
      }

      context.fillStyle = "rgba(15, 23, 42, 0.7)";
      context.fillRect(24, canvasHeight - 72, 420, 44);
      context.fillStyle = "#ffffff";
      context.font = "600 22px Arial";
      context.fillText(`YourTube Watch Together${roomId ? ` - ${roomId}` : ""}`, 40, canvasHeight - 42);

      drawingFrameRef.current = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    const capturedStream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    recordingAudioContextRef.current = audioContext;
    const audioDestination = audioContext.createMediaStreamDestination();

    [localStreamRef.current, remoteStreamRef.current, screenStreamRef.current].forEach((stream) => {
      if (!stream || !stream.getAudioTracks().length) return;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioDestination);
    });

    audioDestination.stream.getAudioTracks().forEach((track) => {
      capturedStream.addTrack(track);
    });

    recordingStreamRef.current = capturedStream;
    return capturedStream;
  };

  const handleStartRecording = async () => {
    if (isRecording) return;
    if (!peerConnectionRef.current) {
      toast.error("Connect to a room before recording.");
      return;
    }

    const mimeType = getSupportedRecordingMimeType();
    if (!mimeType) {
      toast.error("This browser doesn't support in-app call recording.");
      return;
    }

    try {
      recordingChunksRef.current = [];
      const stream = buildCompositeRecordingStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!recordingChunksRef.current.length) {
          releaseRecordingResources();
          return;
        }

        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = buildRecordingFilename(roomId || "session");
        anchor.click();
        URL.revokeObjectURL(downloadUrl);

        toast.success("Recording saved to your device.");
        releaseRecordingResources();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((currentValue) => currentValue + 1);
      }, 1000);
      toast.success("Recording started.");
    } catch (error) {
      console.error(error);
      releaseRecordingResources();
      toast.error("Unable to start recording.");
    }
  };

  const handleHangUp = async () => {
    try {
      if (roomId) {
        await updateDoc(doc(db, "watchTogetherRooms", roomId), {
          endedAt: serverTimestamp(),
          status: "ended",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      stopRecording();
      resetCallState();
      setRoomPhase("ended");
      setStatusText("Call ended. Create a new room any time.");
    }
  };

  const recordingMinutes = Math.floor(recordingDuration / 60)
    .toString()
    .padStart(2, "0");
  const recordingSeconds = (recordingDuration % 60).toString().padStart(2, "0");

  useEffect(() => {
    if (initialRoomId && !roomIdInput) {
      setRoomIdInput(initialRoomId);
    }
  }, [initialRoomId, roomIdInput]);

  useEffect(() => {
    return () => {
      stopRecording();
      resetCallState();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_32%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_48%,_#f8fafc_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-[2rem] border border-red-100 bg-white/90 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1 text-sm font-medium text-red-700">
                <Radio className="h-4 w-4" />
                Task 6 - Watch Together VoIP
              </div>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Video call, share a YouTube tab, and save the session locally.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  This room gives friends a lightweight in-app calling space for live discussion. Start a room, invite someone with the code, share a YouTube browser tab from the screen-share picker, and record the session directly to your device.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">WebRTC video + voice</div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">YouTube tab screen share</div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">Local recording download</div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-inner">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Room status</p>
                  <p className="mt-1 text-lg font-semibold">
                    {roomPhase === "connected" ? "Connected" : roomPhase === "ready" ? "Waiting for friend" : roomPhase === "joining" ? "Joining" : roomPhase === "creating" ? "Creating room" : roomPhase === "ended" ? "Ended" : "Idle"}
                  </p>
                </div>
                {isRecording ? (
                  <div className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-medium text-red-200">
                    REC {recordingMinutes}:{recordingSeconds}
                  </div>
                ) : null}
              </div>
              <p className="min-h-12 text-sm leading-6 text-slate-300">{statusText}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button
                  className="h-11 rounded-full bg-red-600 text-white hover:bg-red-500"
                  onClick={handleCreateRoom}
                  disabled={roomPhase === "creating" || roomPhase === "joining"}
                >
                  <PhoneCall className="h-4 w-4" />
                  Create room
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-full border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  onClick={handleJoinRoom}
                  disabled={roomPhase === "creating" || roomPhase === "joining"}
                >
                  <Video className="h-4 w-4" />
                  Join room
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                <label className="text-sm font-medium text-slate-300">Room code</label>
                <Input
                  value={roomIdInput}
                  onChange={(event) => setRoomIdInput(event.target.value)}
                  placeholder="Paste room code here"
                  className="h-11 rounded-2xl border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                />
              </div>
              {!user ? (
                <p className="mt-3 text-sm text-amber-200">
                  Sign in first so the browser can associate the room with your account.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">You</h2>
                    <p className="text-sm text-slate-500">Camera and microphone preview</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {user?.name || "Signed-out user"}
                  </div>
                </div>
                <div className="aspect-video bg-slate-950">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Friend</h2>
                    <p className="text-sm text-slate-500">Remote participant stream</p>
                  </div>
                  <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                    {joinLabel || "Invite pending"}
                  </div>
                </div>
                <div className="aspect-video bg-slate-950">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Shared screen</h2>
                  <p className="text-sm text-slate-500">Pick the YouTube browser tab in the share dialog for co-watching.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isScreenSharing ? (
                    <Button variant="outline" className="rounded-full" onClick={handleStopScreenShare}>
                      Stop sharing
                    </Button>
                  ) : (
                    <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={handleStartScreenShare}>
                      <MonitorUp className="h-4 w-4" />
                      Share YouTube tab
                    </Button>
                  )}
                  {isRecording ? (
                    <Button variant="outline" className="rounded-full border-red-200 text-red-600" onClick={stopRecording}>
                      <Save className="h-4 w-4" />
                      Stop & save
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-full" onClick={handleStartRecording}>
                      <Save className="h-4 w-4" />
                      Record call
                    </Button>
                  )}
                  <Button variant="destructive" className="rounded-full" onClick={handleHangUp}>
                    <PhoneOff className="h-4 w-4" />
                    Hang up
                  </Button>
                </div>
              </div>
              <div className="aspect-[16/8] bg-slate-950">
                <video
                  ref={screenPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Invite a friend</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Share the room code or the direct link below. The first friend to join becomes the remote participant.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Room code</p>
                  <p className="mt-2 break-all text-lg font-semibold text-slate-950">{roomId || "Create or join a room to generate a code."}</p>
                </div>
                <Button variant="outline" className="w-full rounded-full" onClick={() => handleCopy(roomId, "Room code copied.")} disabled={!roomId}>
                  <Copy className="h-4 w-4" />
                  Copy room code
                </Button>
                <Button variant="outline" className="w-full rounded-full" onClick={() => handleCopy(inviteLink, "Invite link copied.")} disabled={!inviteLink}>
                  <Copy className="h-4 w-4" />
                  Copy invite link
                </Button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Shared YouTube link</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                This doesn&apos;t replace screen share, but it keeps both people aligned on which video or playlist the room is discussing.
              </p>
              <div className="mt-4 space-y-3">
                <Input
                  value={sharedUrlInput}
                  onChange={(event) => setSharedUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-11 rounded-2xl"
                />
                <Button className="w-full rounded-full bg-red-600 text-white hover:bg-red-500" onClick={() => void syncSharedVideo(sharedUrlInput)} disabled={!roomId}>
                  Update shared link
                </Button>
                {sharedVideoUrl ? (
                  <Link
                    href={sharedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Open shared YouTube link
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No link has been shared in this room yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm">
              <h2 className="text-lg font-semibold">Browser notes</h2>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                <li>Chrome and Edge usually provide the best support for WebRTC screen share and local recording.</li>
                <li>To share YouTube audio too, choose a browser tab instead of the full desktop when the picker appears.</li>
                <li>Recordings are downloaded locally in the browser and are not uploaded to the server.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WatchTogetherRoom;
