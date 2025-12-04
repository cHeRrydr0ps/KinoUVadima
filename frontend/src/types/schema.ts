// client/src/types/schema.ts
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: "user" | "admin" | "moderator" | "administrator";
}

export interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

export interface Genre {
  genre_id: number;
  name: string;
}

export interface Movie {
  id: string;
  titleLocalized: string;
  titleOriginal?: string;
  description?: string;
  posterUrl?: string;
  ratingImdb?: number;
  year?: number;
  durationMin?: number;
  ageRating?: string;
  country?: string;
  genres?: Genre[];
  genreIds?: number[];
}

export interface OnlineMovie extends Movie {
  // цены/метаданные для B2C
  price?: number;
  rentPrice?: number;
  buyPrice?: number;
  trailerUrl?: string;
  videoUrl?: string;
}

export interface Genre {
  genre_id: number;
  name: string;
}

export interface OfflineMovie extends Movie {
  // метаданные для B2B (кинотеатров)
  b2bPrice?: number;
  availableFrom?: string;
  availableTo?: string;
  trailer?: string;
  trailerUrl?: string;
  genres?: Genre[];
  genreIds?: number[];
  movieId?: number;
}

export interface Review {
  id: string;
  movieId: string;
  userId: string;
  rating: number;  // 1..5
  text?: string;
  createdAt?: string;
  user?: Pick<User, "id" | "name" | "avatarUrl">;
}
