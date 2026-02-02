<script lang="ts">
</script>

<div class="skeleton-card" aria-busy="true" aria-label="Loading song of the day">
  <div class="thumbnail-skeleton"></div>
  <div class="info">
    <div class="label-skeleton"></div>
    <div class="title-skeleton"></div>
    <div class="artist-skeleton"></div>
  </div>
</div>

<style>
  .skeleton-card {
    display: flex;
    gap: 12px;
    padding: 12px;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 400px;
    min-width: 280px;

    box-shadow: 0 2px 8px var(--shadow-color);
  }

  .thumbnail-skeleton {
    flex-shrink: 0;
    width: 120px;
    height: 67px;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--border-color) 25%,
      color-mix(in srgb, var(--border-color) 50%, var(--card-background) 50%) 50%,
      var(--border-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border: 2px solid var(--border-color);
  }

  .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
  }

  .label-skeleton {
    width: 60%;
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      var(--border-color) 25%,
      color-mix(in srgb, var(--border-color) 50%, var(--card-background) 50%) 50%,
      var(--border-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .title-skeleton {
    width: 90%;
    height: 15px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      var(--border-color) 25%,
      color-mix(in srgb, var(--border-color) 50%, var(--card-background) 50%) 50%,
      var(--border-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .artist-skeleton {
    width: 70%;
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      var(--border-color) 25%,
      color-mix(in srgb, var(--border-color) 50%, var(--card-background) 50%) 50%,
      var(--border-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Mobile: normal document flow */
  @media (max-width: 768px) {
    .skeleton-card {
      max-width: 320px;
      padding: 10px;
      gap: 10px;
      align-items: center;
    }

    .thumbnail-skeleton {
      width: 80px;
      height: 45px;
    }

    .info {
      justify-content: center;
    }

    .label-skeleton {
      width: 50%;
      height: 9px;
    }

    .title-skeleton {
      width: 85%;
      height: 12px;
    }

    .artist-skeleton {
      width: 65%;
      height: 10px;
    }
  }

  /* Very small mobile screens - less than 360px */
  @media (max-width: 360px) {
    .skeleton-card {
      max-width: 100%;
      padding: 6px;
      gap: 6px;
    }

    .thumbnail-skeleton {
      width: 60px;
      height: 34px;
    }

    .info {
      justify-content: center;
    }

    .label-skeleton {
      width: 45%;
      height: 8px;
    }

    .title-skeleton {
      width: 80%;
      height: 11px;
    }

    .artist-skeleton {
      width: 60%;
      height: 9px;
    }
  }
</style>
