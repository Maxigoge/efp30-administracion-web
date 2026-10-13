import { Icon } from "./Icon";

export interface GalleryPhotoView {
  id: string;
  courseName: string;
  src: string;
  alt: string;
  order: number;
  inCarousel: boolean;
  isCardCover: boolean;
  isPublic: boolean;
  coursePublished: boolean;
}

/** Se usa al presentar el carrusel: los borradores y las fotos privadas nunca entran. */
export function selectPublicCarouselPhotos(photos: GalleryPhotoView[]): GalleryPhotoView[] {
  return photos
    .filter((photo) => photo.inCarousel && photo.isPublic && photo.coursePublished)
    .sort((left, right) => left.order - right.order);
}

export function CourseWorkspace() {
  const photos: GalleryPhotoView[] = [];
  const carousel = selectPublicCarouselPhotos(photos);
  return <div className="workspace-section">
    <div className="module-toolbar">
      <label className="module-search"><Icon name="search" size={17} /><input type="search" placeholder="Buscar cursos" disabled aria-label="Buscar cursos" /></label>
      <button className="button button--primary" disabled><Icon name="plus" size={17} /> Nuevo curso</button>
    </div>
    <section className="course-empty panel"><span className="module-placeholder__icon"><Icon name="courses" size={25} /></span><h2>La oferta formativa aparecerá acá</h2><p>Los cursos y sus familias se cargarán desde la API institucional.</p><span className="workspace-footnote"><Icon name="lock" size={15} /> Sin datos ni acciones simuladas</span></section>
    <CourseGalleryEditor photos={photos} carousel={carousel} />
  </div>;
}

function CourseGalleryEditor({ photos, carousel }: { photos: GalleryPhotoView[]; carousel: GalleryPhotoView[] }) {
  const cover = photos.find((photo) => photo.isCardCover);
  return <section className="gallery-editor">
    <div className="gallery-editor__heading"><div><p className="eyebrow">FOTOGRAFÍAS DEL CURSO</p><h2>Galería y portada</h2><p>La portada de la tarjeta se administra por separado de la selección del carrusel.</p></div><button className="button button--primary" disabled><Icon name="plus" size={17} /> Subir fotografías</button></div>
    <div className="gallery-editor__grid">
      <div className="gallery-settings">
        <div className="gallery-setting"><span className="gallery-setting__icon"><Icon name="media" /></span><div><strong>Texto alternativo</strong><small>Describí cada fotografía para lectores de pantalla.</small></div></div>
        <div className="gallery-setting"><span className="gallery-setting__icon"><Icon name="grid" /></span><div><strong>Mostrar en portada</strong><small>Elegí fotos públicas y definí su orden en el carrusel.</small></div></div>
        <div className="gallery-setting"><span className="gallery-setting__icon"><Icon name="courses" /></span><div><strong>Portada de la tarjeta</strong><small>Elección independiente para la ficha del curso.</small></div></div>
        {photos.length === 0 && <div className="gallery-no-photos"><Icon name="media" size={19} /><span>Todavía no hay fotografías disponibles.</span></div>}
        <div className="gallery-selection-note"><Icon name="lock" size={15} /> Orden y selección editables al integrar la API.</div>
      </div>
      <div className="carousel-preview">
        <div className="carousel-preview__top"><div><span className="carousel-preview__icon"><Icon name="media" size={16} /></span><div><strong>Vista previa combinada</strong><small>Fotos públicas de cursos publicados</small></div></div><span className="preview-count">{carousel.length} fotos</span></div>
        {carousel.length === 0
          ? <div className="carousel-preview__empty"><span className="carousel-preview__frame"><Icon name="media" size={26} /></span><strong>El carrusel está vacío</strong><small>La selección de todos los cursos aparecerá en este orden.</small></div>
          : <div className="carousel-preview__items">{carousel.map((photo) => <figure key={photo.id}><img src={photo.src} alt={photo.alt} /><figcaption>{photo.courseName} · {photo.alt}</figcaption></figure>)}</div>}
      </div>
    </div>
    {cover && <p className="cover-current">Portada de tarjeta elegida: {cover.alt || "sin texto alternativo"}</p>}
    <p className="workspace-footnote"><Icon name="shield" size={15} /> En portada solo se mostrarán fotografías públicas de cursos publicados.</p>
  </section>;
}
