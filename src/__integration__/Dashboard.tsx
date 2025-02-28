import React, { useMemo } from 'react';
import { MostRecentVideos, Video, VideoCompartments, VideoGalleryTokens } from '../__tests__/VideoData';
import { useSubject } from '../hooks';
import { usePredicate } from '../hooks/usePredicate';

function useVideoGallery() {
  const initialized = usePredicate<VideoCompartments>(VideoGalleryTokens.dashboard, ['mostRecent']);
  const videos = useSubject(MostRecentVideos);
  const mostRecent = useMemo(() => videos ?? [], [videos]);

  return {
    loading: !initialized,
    mostRecent,
  };
}

type DashboardContainerProps = {
  onRefresh: () => void;
};

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ onRefresh }) => {
  const { loading, mostRecent } = useVideoGallery();
  return <Dashboard loading={loading} mostRecent={mostRecent} onRefresh={onRefresh} />;
};

type DashboardProps = {
  loading: boolean;
  mostRecent: Video[];
  onRefresh: () => void;
};

export const Dashboard: React.FC<DashboardProps> = ({ loading, mostRecent, onRefresh }) => {
  if (loading) {
    return <p role="spinner">Loading...</p>;
  }

  return (
    <div>
      <h2>Recent Uploads</h2>
      <ul>
        {mostRecent.map((video) => (
          <li key={video.id} role="video">
            {video.title}
          </li>
        ))}
      </ul>
      <button onClick={onRefresh} role="refresh">
        Refresh
      </button>
    </div>
  );
};
