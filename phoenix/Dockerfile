# Stage 1: Build Zig WASM
FROM ghcr.io/ziglang/zig:0.15.2 AS zig-build
WORKDIR /build
COPY zig/ ./zig/
RUN cd zig && zig build -Doptimize=ReleaseSmall

# Stage 2: Build RedwoodJS web
FROM node:20-alpine AS web-build
WORKDIR /build
COPY redwood/ ./redwood/
COPY --from=zig-build /build/zig/zig-out/bin/chrono_stats.wasm redwood/web/public/chrono_stats.wasm
RUN cd redwood && yarn install && yarn rw build web

# Stage 3: Build Elixir release
FROM elixir:1.19-otp-28-alpine AS elixir-build
RUN apk add --no-cache git build-base
WORKDIR /build
ENV MIX_ENV=prod
COPY phoenix/mix.exs phoenix/mix.lock ./
COPY phoenix/config config
RUN mix local.hex --force && mix local.rebar --force
RUN mix deps.get --only prod && mix deps.compile
COPY phoenix/lib lib
COPY phoenix/priv priv
COPY --from=web-build /build/redwood/web/dist priv/static
RUN mix compile && mix release

# Stage 4: Runtime
FROM alpine:3.20 AS runtime
RUN apk add --no-cache libstdc++ openssl ncurses-libs
WORKDIR /app
COPY --from=elixir-build /build/_build/prod/rel/chrono_type ./
ENV PHX_SERVER=true
EXPOSE 4000
CMD ["sh", "-c", "bin/chrono_type eval 'ChronoType.Release.migrate()' && bin/chrono_type start"]
