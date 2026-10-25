import { PhotoAlbumGrid } from "../../components/PhotoAlbumGrid";
import { PHOTO_ALBUMS } from "../../lib/photo-albums";

export default function PhotosPage() {
  return <PhotoAlbumGrid groups={PHOTO_ALBUMS} />;
}
