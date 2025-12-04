export interface Genre {
  genre_id: number;
  name: string;
}

export interface MovieGenre {
  genre_id: number;
  movie_id: number;
  genre?: Genre;
}

export interface OfflineMovie {
  id?: number;
  movieId: number;
  titleLocalized: string;
  titleOriginal?: string;
  shortDescription?: string;
  description?: string;
  country?: string;
  year?: number;
  durationMin?: number;
  ageRating?: string;
  ratingImdb?: number;
  posterUrl?: string;
  trailerUrl?: string;
  torrentUrl?: string;
  price?: number;
  boxOfficeExpectationRub?: number;
  isNew?: boolean;
  isExclusive?: boolean;
  isNewRelease?: boolean;
  genres?: MovieGenre[];
  genreIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}
