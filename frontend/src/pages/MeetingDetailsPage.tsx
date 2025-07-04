import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PlayIcon,
  PauseIcon,
  Loader2,
  FileText,
  CheckSquare,
  Flag,
  Sparkles,
  ListTree,
  FolderOpen,
  AlertTriangle,
  FileAudio,
  Download,
  Volume2,
  Volume1,
  VolumeX,
  Rewind,
  FastForward,
  RotateCcw,
} from "lucide-react";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.5, 0.75];

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

function MeetingDetailsPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const animationFrameIdRef = useRef<number>();

  const audioSrc = meeting?.audio_file.storage_path_or_url
    ? `${BACKEND_API_BASE_URL}${meeting.audio_file.storage_path_or_url}`
    : "";

  const downloadUrl = meeting
    ? `${BACKEND_API_BASE_URL}/meetings/${meeting._id}/download`
    : "";

  const fetchData = useCallback(async () => {
    if (!token || !meetingId) {
      setError("Authentication token or Meeting ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const meetingApiUrl = `${BACKEND_API_BASE_URL}/meetings/${meetingId}`;
    try {
      const response = await fetch(meetingApiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404)
          throw new Error(`Meeting with ID "${meetingId}" not found.`);
        throw new Error(
          `Failed to fetch meeting details (Status: ${response.status})`
        );
      }
      const meetingData: Meeting = await response.json();
      setMeeting(meetingData);
    } catch (err: any) {
      setError(err.message || "Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [meetingId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };
    const handlePlayPause = () => setIsPlaying(!audio.paused);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("play", handlePlayPause);
    audio.addEventListener("pause", handlePlayPause);
    audio.addEventListener("ended", handleEnded);

    audio.playbackRate = playbackRate;
    audio.volume = volume;
    audio.muted = isMuted;

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("play", handlePlayPause);
      audio.removeEventListener("pause", handlePlayPause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioSrc, playbackRate, volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const animate = () => {
      if (audio.paused) return;
      setCurrentTime(audio.currentTime);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying && !isSeeking) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, isSeeking]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    }
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + 10);
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handlePlaybackRateCycle = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading meeting details...</span>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState message={error} onRetry={fetchData}>
        <Button variant="outline" asChild>
          <Link to="/meetings">← Back to Meetings</Link>
        </Button>
      </ErrorState>
    );
  }
  if (!meeting) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Meeting Not Found"
        description="We couldn't find a meeting with the specified ID."
      />
    );
  }

  const processedDate = format(new Date(meeting.meeting_datetime), "PPP, p");

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-center mb-8">
        <Link
          to={`/meetings`}
          className="subtle hover:text-foreground transition-colors"
        >
          ← Back to Meetings
        </Link>
      </div>

      <div className="space-y-4">
        <h1>{meeting.title}</h1>
        <p className="subtle">Processed on {processedDate}</p>
        {meeting.processing_status.error_message && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Processing Failed!</AlertTitle>
            <AlertDescription>
              {meeting.processing_status.error_message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <FileAudio size={20} /> Recording
        </h4>
        <div className="p-4 bg-card rounded-[var(--radius-container)] border shadow-sm">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRewind}
                className="flex-shrink-0"
                aria-label="Rewind 10 seconds"
              >
                <Rewind className="h-5 w-5" fill="currentColor" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className={cn("flex-shrink-0", !isPlaying)}
                aria-label={isPlaying ? "Pause recording" : "Play recording"}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" fill="currentColor" />
                ) : (
                  <PlayIcon className="h-5 w-5" fill="currentColor" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleForward}
                className="flex-shrink-0"
                aria-label="Forward 10 seconds"
              >
                <FastForward className="h-5 w-5" fill="currentColor" />
              </Button>
            </div>

            <div className="flex-grow flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-14 text-right font-mono">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={1}
                onValueChange={handleSliderChange}
                onSeeking={setIsSeeking}
                className="flex-grow"
                disabled={duration === 0 || !audioSrc}
              />
              <span
                className="text-xs text-muted-foreground w-14 text-left cursor-pointer hover:text-foreground transition-colors font-mono"
                onClick={() => setShowRemainingTime((prev) => !prev)}
                title="Toggle remaining time"
              >
                {showRemainingTime
                  ? `-${formatTime(duration - currentTime)}`
                  : formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full flex-shrink-0"
                aria-label="Cycle playback speed"
                onClick={handlePlaybackRateCycle}
              >
                <span className="text-xs font-semibold">{playbackRate}x</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRestart}
                className="flex-shrink-0"
                aria-label="Restart recording"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={isMuted ? [0] : [volume]}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                  aria-label="Volume control"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                asChild
                disabled={!audioSrc}
                aria-label={`Download audio file: ${meeting.audio_file.original_filename}`}
              >
                <a href={downloadUrl} download>
                  <Download className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
          <audio ref={audioRef} src={audioSrc} preload="metadata" />
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          {meeting.ai_analysis?.summary ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3">
                <Sparkles size={20} /> <h4>Summary</h4>
              </div>
              <p className="text-foreground/80 leading-relaxed">
                {meeting.ai_analysis.summary}
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Summary Not Available"
              description="AI analysis has not yet been performed or failed for this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="topics">
          {meeting.ai_analysis?.key_topics &&
          meeting.ai_analysis.key_topics.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3">
                <ListTree size={20} /> <h4>Key Topics</h4>
              </div>
              <div className="space-y-4">
                {meeting.ai_analysis.key_topics.map((item, index) => (
                  <div key={index}>
                    <h4 className="font-semibold text-foreground">
                      {item.topic}
                    </h4>
                    <p className="text-foreground/80">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={ListTree}
              title="No Key Topics Found"
              description="Key topics could not be extracted from this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="action-items">
          {meeting.ai_analysis?.action_items &&
          meeting.ai_analysis.action_items.length > 0 ? (
            <div className="space-y-4 p-6">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <CheckSquare size={20} /> <h4>Action Items</h4>
              </div>
              {meeting.ai_analysis.action_items.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Checkbox id={`action-item-${index}`} className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`action-item-${index}`}
                      className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item.description}
                    </label>
                    {(item.assigned_to || item.due_date) && (
                      <p className="text-xs text-muted-foreground">
                        {item.assigned_to && `Assigned to: ${item.assigned_to}`}
                        {item.assigned_to && item.due_date && " | "}
                        {item.due_date && `Due: ${item.due_date}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckSquare}
              title="No Action Items Found"
              description="No actionable tasks were identified in this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="decisions">
          {meeting.ai_analysis?.decisions_made &&
          meeting.ai_analysis.decisions_made.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <Flag size={20} /> <h4>Decisions</h4>
              </div>
              <ul className="space-y-2 list-disc pl-5">
                {meeting.ai_analysis.decisions_made.map((item, index) => (
                  <li key={index} className="text-foreground/80">
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={Flag}
              title="No Key Decisions Recorded"
              description="No formal decisions were identified in this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="transcript">
          {meeting.transcription?.full_text ? (
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed p-6">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <FileText size={20} /> <h4>Full Transcript</h4>
              </div>
              {meeting.transcription.full_text}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No Transcript Available"
              description="Transcription is not yet complete or failed for this meeting."
              className="py-8"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MeetingDetailsPage;
