
### star

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 0.00 | 1.09 | 1 entries, 279 B | 0.04 | 0.01 (1) | 1.64 | 55 |
| 2 | E | valid | 2.00 | 1.83 | 4 entries, 2469 B | 0.36 | 0.02 (4) | 2.84 | 56 |
| 3 | E | valid | 6.00 | 5.82 | 64 entries, 65089 B | 2.06 | 0.12 (64) | 9.71 | 62 |
| 4 | E | valid | 12.0 | 177.1 | 4096 entries, 6066177 B | 103.4 | 3.10 (4096) | 321.9 | 114 |
| 5 | E | limit: time 60 s |  |  |  entries,  B |  |  |  |  |
| 1 | A | valid | 0.00 | 0.43 | 1, 237 B | 0.80 | 0.08 (11) | 1.52 | 55 |
| 2 | A | valid | 2.00 | 0.74 | 1, 473 B | 0.62 | 0.10 (21) | 1.69 | 55 |
| 3 | A | valid | 6.00 | 0.87 | 1, 709 B | 0.61 | 0.10 (31) | 1.81 | 55 |
| 4 | A | valid | 12.0 | 0.95 | 1, 948 B | 0.56 | 0.11 (41) | 1.86 | 56 |
| 5 | A | valid | 20.0 | 1.20 | 1, 1187 B | 0.73 | 0.13 (51) | 2.37 | 55 |
| 6 | A | valid | 30.0 | 1.09 | 1, 1426 B | 0.63 | 0.12 (61) | 2.12 | 56 |
| 8 | A | valid | 56.0 | 0.74 | 1, 1904 B | 1.01 | 0.38 (81) | 2.40 | 56 |
| 12 | A | valid | 132.0 | 0.65 | 1, 2872 B | 1.05 | 0.22 (121) | 2.52 | 56 |
| 16 | A | valid | 240.0 | 0.73 | 1, 3844 B | 1.39 | 0.31 (161) | 3.10 | 57 |
| 24 | A | valid | 552.0 | 1.16 | 1, 5788 B | 1.49 | 0.50 (241) | 3.57 | 58 |
| 32 | A | valid | 992.0 | 1.24 | 1, 7732 B | 1.94 | 0.34 (321) | 4.02 | 60 |
| 48 | A | valid | 2256 | 1.32 | 1, 11665 B | 3.43 | 0.29 (481) | 5.72 | 63 |
| 64 | A | valid | 4032 | 1.45 | 1, 15601 B | 3.98 | 0.34 (641) | 6.60 | 64 |
| 96 | A | valid | 9120 | 1.86 | 1, 23473 B | 5.52 | 0.38 (961) | 9.01 | 65 |
| 128 | A | valid | 16256 | 2.18 | 1, 31461 B | 7.38 | 0.52 (1281) | 11.6 | 65 |
| 192 | A | valid | 36672 | 3.15 | 1, 47461 B | 13.0 | 0.66 (1921) | 19.3 | 66 |
| 256 | A | valid | 65280 | 3.64 | 1, 63461 B | 19.4 | 0.67 (2561) | 26.9 | 71 |
| 384 | A | valid | 147072 | 4.70 | 1, 95614 B | 38.3 | 0.98 (3841) | 49.6 | 73 |
| 512 | A | valid | 261632 | 6.51 | 1, 127998 B | 58.8 | 1.25 (5121) | 75.7 | 74 |
| 768 | A | valid | 589056 | 8.54 | 1, 192766 B | 132.5 | 2.04 (7681) | 160.4 | 84 |
| 1024 | A | valid | 1047552 | 10.4 | 1, 257634 B | 202.7 | 2.31 (10241) | 243.5 | 85 |
| 1536 | A | valid | 2357760 | 16.2 | 1, 389218 B | 462.3 | 3.20 (15361) | 541.5 | 106 |
| 2048 | A | valid | 4192256 | 20.7 | 1, 520802 B | 796.1 | 4.37 (20481) | 891.6 | 110 |
| 3072 | A | valid | 9434112 | 40.5 | 1, 783970 B | 1810 | 5.83 (30721) | 1997 | 151 |
| 4096 | A | valid | 16773120 | 60.3 | 1, 1049427 B | 3194 | 8.89 (40961) | 3496 | 158 |
| 6144 | A | valid | 37742592 | 112.9 | 1, 1581907 B | 7610 | 13.9 (61441) | 8268 | 188 |
| 8192 | A | valid | 67100672 | 173.4 | 1, 2114387 B | 13008 | 17.9 (81921) | 14108 | 196 |
| 12288 | A | valid | 150982656 | 327.7 | 1, 3188503 B | 30270 | 26.2 (122881) | 32627 | 249 |
| 16384 | A | valid | 268419072 | 545.3 | 1, 4269847 B | 55507 | 38.2 (163841) | 59699 | 360 |
| 32768 | A | limit: time 60 s |  |  |  |  |  |  |  |
| 1 | B | valid | 0.00 | 0.41 | 1 leaves, 258 B | 0.81 | 0.28 (11, 1 nodes) | 1.85 | 55 |
| 2 | B | valid | 2.00 | 0.76 | 2 leaves, 515 B | 0.55 | 0.31 (22, 2 nodes) | 2.02 | 55 |
| 3 | B | valid | 6.00 | 0.95 | 3 leaves, 772 B | 0.49 | 0.34 (33, 3 nodes) | 2.17 | 55 |
| 4 | B | valid | 12.0 | 0.79 | 4 leaves, 1032 B | 0.59 | 0.75 (44, 4 nodes) | 2.59 | 55 |
| 5 | B | valid | 20.0 | 0.64 | 5 leaves, 1292 B | 0.58 | 0.93 (55, 5 nodes) | 2.61 | 56 |
| 6 | B | valid | 30.0 | 0.75 | 6 leaves, 1552 B | 0.68 | 1.11 (66, 6 nodes) | 3.02 | 56 |
| 8 | B | valid | 56.0 | 0.67 | 8 leaves, 2072 B | 1.12 | 0.85 (88, 8 nodes) | 3.15 | 56 |
| 12 | B | valid | 132.0 | 0.68 | 12 leaves, 3124 B | 1.07 | 0.59 (132, 12 nodes) | 3.18 | 56 |
| 16 | B | valid | 240.0 | 0.79 | 16 leaves, 4180 B | 1.40 | 0.75 (176, 16 nodes) | 3.91 | 56 |
| 24 | B | valid | 552.0 | 0.85 | 24 leaves, 6292 B | 1.91 | 0.83 (264, 24 nodes) | 4.29 | 59 |
| 32 | B | valid | 992.0 | 0.89 | 32 leaves, 8404 B | 2.05 | 0.97 (352, 32 nodes) | 4.67 | 60 |
| 48 | B | valid | 2256 | 1.24 | 48 leaves, 12673 B | 3.86 | 1.30 (528, 48 nodes) | 7.61 | 64 |
| 64 | B | valid | 4032 | 1.37 | 64 leaves, 16945 B | 4.47 | 1.35 (704, 64 nodes) | 8.47 | 65 |
| 96 | B | valid | 9120 | 1.71 | 96 leaves, 25489 B | 6.29 | 1.50 (1056, 96 nodes) | 11.4 | 65 |
| 128 | B | valid | 16256 | 1.94 | 128 leaves, 34149 B | 7.76 | 1.81 (1408, 128 nodes) | 13.6 | 65 |
| 192 | B | valid | 36672 | 2.35 | 192 leaves, 51493 B | 13.1 | 2.46 (2112, 192 nodes) | 20.9 | 67 |
| 256 | B | valid | 65280 | 3.10 | 256 leaves, 68837 B | 21.5 | 2.89 (2816, 256 nodes) | 31.7 | 70 |
| 384 | B | valid | 147072 | 3.51 | 384 leaves, 103678 B | 42.1 | 3.28 (4224, 384 nodes) | 55.4 | 73 |
| 512 | B | valid | 261632 | 4.80 | 512 leaves, 138750 B | 65.3 | 4.32 (5632, 512 nodes) | 84.5 | 74 |
| 768 | B | valid | 589056 | 5.82 | 768 leaves, 208894 B | 132.9 | 5.82 (8448, 768 nodes) | 163.8 | 83 |
| 1024 | B | valid | 1047552 | 8.63 | 1024 leaves, 279138 B | 250.6 | 8.27 (11264, 1024 nodes) | 297.8 | 84 |
| 1536 | B | valid | 2357760 | 12.5 | 1536 leaves, 421474 B | 514.1 | 10.5 (16896, 1536 nodes) | 600.0 | 104 |
| 2048 | B | valid | 4192256 | 17.9 | 2048 leaves, 563810 B | 898.4 | 14.3 (22528, 2048 nodes) | 1008 | 107 |
| 3072 | B | valid | 9434112 | 34.1 | 3072 leaves, 848482 B | 2087 | 20.2 (33792, 3072 nodes) | 2292 | 146 |
| 4096 | B | valid | 16773120 | 51.8 | 4096 leaves, 1135443 B | 3670 | 27.4 (45056, 4096 nodes) | 3996 | 177 |
| 6144 | B | valid | 37742592 | 97.8 | 6144 leaves, 1710931 B | 8402 | 43.3 (67584, 6144 nodes) | 9073 | 215 |
| 8192 | B | valid | 67100672 | 176.7 | 8192 leaves, 2286419 B | 15261 | 56.1 (90112, 8192 nodes) | 16417 | 283 |
| 12288 | B | valid | 150982656 | 335.2 | 12288 leaves, 3446551 B | 34654 | 78.6 (135168, 12288 nodes) | 37115 | 287 |
| 16384 | B | limit: time 60 s |  |  |  leaves,  B |  |  |  |  |

### star-read

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 0.00 | 1.13 | 1 entries, 398 B | 0.05 | 0.01 (1) | 1.67 | 55 |
| 2 | E | valid | 2.00 | 1.55 | 4 entries, 3533 B | 0.40 | 0.02 (4) | 2.96 | 57 |
| 3 | E | valid | 6.00 | 6.70 | 64 entries, 93505 B | 2.73 | 0.11 (64) | 11.4 | 62 |
| 4 | E | valid | 12.0 | 239.5 | 4096 entries, 8720385 B | 131.7 | 3.56 (4096) | 426.4 | 151 |
| 5 | E | limit: time 60 s |  |  |  entries,  B |  |  |  |  |
| 1 | A | valid | 0.00 | 0.46 | 1, 336 B | 0.88 | 0.10 (15) | 1.66 | 55 |
| 2 | A | valid | 2.00 | 0.83 | 1, 671 B | 0.59 | 0.09 (29) | 1.75 | 55 |
| 3 | A | valid | 6.00 | 1.00 | 1, 1009 B | 0.55 | 0.10 (43) | 1.92 | 56 |
| 4 | A | valid | 12.0 | 1.05 | 1, 1348 B | 0.57 | 0.11 (57) | 2.02 | 55 |
| 5 | A | valid | 20.0 | 1.17 | 1, 1688 B | 0.65 | 0.12 (71) | 2.22 | 56 |
| 6 | A | valid | 30.0 | 1.02 | 1, 2029 B | 0.96 | 0.12 (85) | 2.35 | 57 |
| 8 | A | valid | 56.0 | 0.79 | 1, 2711 B | 1.00 | 0.14 (113) | 2.48 | 57 |
| 12 | A | valid | 132.0 | 0.82 | 1, 4087 B | 1.38 | 0.28 (169) | 3.21 | 57 |
| 16 | A | valid | 240.0 | 1.08 | 1, 5467 B | 1.19 | 0.27 (225) | 3.10 | 57 |
| 24 | A | valid | 552.0 | 1.32 | 1, 8227 B | 1.83 | 0.33 (337) | 4.00 | 59 |
| 32 | A | valid | 992.0 | 1.38 | 1, 11016 B | 2.35 | 0.36 (449) | 4.63 | 60 |
| 48 | A | valid | 2256 | 1.71 | 1, 16600 B | 5.01 | 0.44 (673) | 8.00 | 64 |
| 64 | A | valid | 4032 | 1.77 | 1, 22213 B | 5.35 | 0.68 (897) | 8.66 | 65 |
| 96 | A | valid | 9120 | 2.40 | 1, 33445 B | 7.08 | 0.43 (1345) | 11.3 | 65 |
| 128 | A | valid | 16256 | 3.01 | 1, 44793 B | 9.28 | 0.47 (1793) | 14.6 | 65 |
| 192 | A | valid | 36672 | 3.92 | 1, 67513 B | 17.3 | 0.65 (2689) | 24.4 | 71 |
| 256 | A | valid | 65280 | 5.44 | 1, 90258 B | 26.3 | 0.81 (3585) | 36.3 | 73 |
| 384 | A | valid | 147072 | 6.64 | 1, 136210 B | 50.4 | 1.27 (5377) | 64.4 | 74 |
| 512 | A | valid | 261632 | 7.89 | 1, 182187 B | 78.7 | 1.40 (7169) | 97.2 | 83 |
| 768 | A | valid | 589056 | 11.3 | 1, 274603 B | 166.5 | 2.15 (10753) | 197.5 | 86 |
| 1024 | A | valid | 1047552 | 13.8 | 1, 367119 B | 282.1 | 2.74 (14337) | 327.9 | 88 |
| 1536 | A | valid | 2357760 | 20.3 | 1, 553999 B | 652.6 | 3.90 (21505) | 739.1 | 109 |
| 2048 | A | valid | 4192256 | 30.4 | 1, 740879 B | 1128 | 5.12 (28673) | 1239 | 115 |
| 3072 | A | valid | 9434112 | 52.5 | 1, 1116928 B | 2577 | 7.40 (43009) | 2777 | 158 |
| 4096 | A | valid | 16773120 | 85.3 | 1, 1494784 B | 4542 | 10.2 (57345) | 4875 | 169 |
| 6144 | A | valid | 37742592 | 136.4 | 1, 2252785 B | 10422 | 16.1 (86017) | 11091 | 202 |
| 8192 | A | valid | 67100672 | 211.2 | 1, 3012593 B | 18246 | 20.7 (114689) | 19399 | 216 |
| 12288 | A | valid | 150982656 | 392.3 | 1, 4541365 B | 43098 | 37.1 (172033) | 45565 | 280 |
| 16384 | A | limit: time 60 s |  |  |  |  |  |  |  |
| 1 | B | valid | 0.00 | 0.73 | 1 leaves, 357 B | 0.54 | 0.31 (15, 1 nodes) | 2.02 | 55 |
| 2 | B | valid | 2.00 | 0.87 | 2 leaves, 713 B | 0.50 | 0.34 (30, 2 nodes) | 2.22 | 55 |
| 3 | B | valid | 6.00 | 0.67 | 3 leaves, 1072 B | 0.51 | 0.62 (45, 3 nodes) | 2.18 | 56 |
| 4 | B | valid | 12.0 | 0.63 | 4 leaves, 1432 B | 0.56 | 0.72 (60, 4 nodes) | 2.33 | 55 |
| 5 | B | valid | 20.0 | 0.64 | 5 leaves, 1793 B | 0.62 | 0.96 (75, 5 nodes) | 2.66 | 56 |
| 6 | B | valid | 30.0 | 0.67 | 6 leaves, 2155 B | 0.94 | 0.87 (90, 6 nodes) | 2.94 | 56 |
| 8 | B | valid | 56.0 | 0.72 | 8 leaves, 2879 B | 0.98 | 0.62 (120, 8 nodes) | 3.05 | 57 |
| 12 | B | valid | 132.0 | 0.79 | 12 leaves, 4339 B | 1.22 | 0.64 (180, 12 nodes) | 3.50 | 56 |
| 16 | B | valid | 240.0 | 1.17 | 16 leaves, 5803 B | 1.33 | 0.82 (240, 16 nodes) | 4.34 | 57 |
| 24 | B | valid | 552.0 | 0.97 | 24 leaves, 8731 B | 1.92 | 0.87 (360, 24 nodes) | 4.49 | 60 |
| 32 | B | valid | 992.0 | 1.14 | 32 leaves, 11688 B | 2.61 | 1.36 (480, 32 nodes) | 6.04 | 60 |
| 48 | B | valid | 2256 | 1.35 | 48 leaves, 17608 B | 3.79 | 1.37 (720, 48 nodes) | 7.65 | 64 |
| 64 | B | valid | 4032 | 1.48 | 64 leaves, 23557 B | 4.72 | 1.60 (960, 64 nodes) | 9.37 | 65 |
| 96 | B | valid | 9120 | 2.10 | 96 leaves, 35461 B | 7.05 | 1.87 (1440, 96 nodes) | 13.0 | 65 |
| 128 | B | valid | 16256 | 2.32 | 128 leaves, 47481 B | 9.40 | 2.23 (1920, 128 nodes) | 16.3 | 66 |
| 192 | B | valid | 36672 | 3.07 | 192 leaves, 71545 B | 17.2 | 3.14 (2880, 192 nodes) | 26.3 | 67 |
| 256 | B | valid | 65280 | 3.74 | 256 leaves, 95634 B | 28.4 | 3.85 (3840, 256 nodes) | 40.6 | 73 |
| 384 | B | valid | 147072 | 5.05 | 384 leaves, 144274 B | 55.5 | 4.77 (5760, 384 nodes) | 72.6 | 73 |
| 512 | B | valid | 261632 | 5.86 | 512 leaves, 192939 B | 85.3 | 5.93 (7680, 512 nodes) | 107.3 | 75 |
| 768 | B | valid | 589056 | 7.85 | 768 leaves, 290731 B | 178.6 | 8.97 (11520, 768 nodes) | 215.9 | 84 |
| 1024 | B | valid | 1047552 | 10.8 | 1024 leaves, 388623 B | 316.8 | 9.94 (15360, 1024 nodes) | 369.7 | 86 |
| 1536 | B | valid | 2357760 | 16.5 | 1536 leaves, 586255 B | 704.7 | 15.0 (23040, 1536 nodes) | 800.8 | 107 |
| 2048 | B | valid | 4192256 | 24.6 | 2048 leaves, 783887 B | 1247 | 19.6 (30720, 2048 nodes) | 1398 | 144 |
| 3072 | B | valid | 9434112 | 43.6 | 3072 leaves, 1181440 B | 2847 | 29.3 (46080, 3072 nodes) | 3069 | 153 |
| 4096 | B | valid | 16773120 | 66.3 | 4096 leaves, 1580800 B | 5023 | 35.7 (61440, 4096 nodes) | 5375 | 189 |
| 6144 | B | valid | 37742592 | 126.9 | 6144 leaves, 2381809 B | 11542 | 56.3 (92160, 6144 nodes) | 12270 | 236 |
| 8192 | B | valid | 67100672 | 215.2 | 8192 leaves, 3184625 B | 20797 | 91.2 (122880, 8192 nodes) | 22091 | 307 |
| 12288 | B | valid | 150982656 | 458.4 | 12288 leaves, 4799413 B | 48093 | 123.2 (184320, 12288 nodes) | 50816 | 309 |
| 16384 | B | limit: time 60 s |  |  |  leaves,  B |  |  |  |  |

### star-undeclared

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | unresolved (no certificate) | 0.00 | 21.8 | 0 entries, 0 B | 0.00 | 0.05 (1) | 22.4 | 69 |
| 2 | E | unresolved (no certificate) | 2.00 | 51.6 | 0 entries, 0 B | 0.00 | 0.07 (4) | 52.4 | 77 |
| 3 | E | unresolved (no certificate) | 6.00 | 81.7 | 0 entries, 0 B | 0.00 | 0.19 (64) | 83.1 | 79 |
| 4 | E | unresolved (no certificate) | 12.0 | 530.9 | 0 entries, 0 B | 0.00 | 3.27 (4096) | 539.2 | 85 |
| 5 | E | limit: time 60 s |  |  |  entries,  B |  |  |  |  |
| 1 | A | unresolved (check: rests 1, 0 not declared disjoint) | 0.00 | 0.41 | 1, 237 B | 0.82 | 0.07 (6) | 1.49 | 55 |
| 2 | A | unresolved (check: rests 2, 0 not declared disjoint) | 2.00 | 0.81 | 1, 473 B | 0.69 | 0.09 (16) | 1.86 | 55 |
| 3 | A | unresolved (check: rests 3, 0 not declared disjoint) | 6.00 | 0.88 | 1, 709 B | 0.68 | 0.10 (26) | 1.91 | 55 |
| 4 | A | unresolved (check: rests 4, 0 not declared disjoint) | 12.0 | 1.08 | 1, 948 B | 0.58 | 0.10 (36) | 2.01 | 56 |
| 5 | A | unresolved (check: rests 5, 0 not declared disjoint) | 20.0 | 1.11 | 1, 1187 B | 0.65 | 0.12 (46) | 2.17 | 56 |
| 6 | A | unresolved (check: rests 6, 0 not declared disjoint) | 30.0 | 1.11 | 1, 1426 B | 0.67 | 0.11 (56) | 2.14 | 56 |
| 8 | A | unresolved (check: rests 8, 0 not declared disjoint) | 56.0 | 0.77 | 1, 1904 B | 0.75 | 0.54 (76) | 2.32 | 56 |
| 12 | A | unresolved (check: rests 12, 0 not declared disjoint) | 132.0 | 0.68 | 1, 2872 B | 1.23 | 0.28 (116) | 2.76 | 57 |
| 16 | A | unresolved (check: rests 16, 0 not declared disjoint) | 240.0 | 0.76 | 1, 3844 B | 1.28 | 0.31 (156) | 2.99 | 57 |
| 24 | A | unresolved (check: rests 24, 0 not declared disjoint) | 552.0 | 1.09 | 1, 5788 B | 1.61 | 0.37 (236) | 3.58 | 59 |
| 32 | A | unresolved (check: rests 32, 0 not declared disjoint) | 992.0 | 1.38 | 1, 7732 B | 2.15 | 0.36 (316) | 4.41 | 60 |
| 48 | A | unresolved (check: rests 48, 0 not declared disjoint) | 2256 | 1.53 | 1, 11665 B | 3.23 | 0.28 (476) | 5.78 | 64 |
| 64 | A | unresolved (check: rests 64, 0 not declared disjoint) | 4032 | 1.69 | 1, 15601 B | 4.38 | 0.35 (636) | 7.35 | 65 |
| 96 | A | unresolved (check: rests 96, 0 not declared disjoint) | 9120 | 2.00 | 1, 23473 B | 5.88 | 0.62 (956) | 9.89 | 65 |
| 128 | A | unresolved (check: rests 128, 0 not declared disjoint) | 16256 | 2.25 | 1, 31461 B | 7.56 | 0.61 (1276) | 12.1 | 65 |
| 192 | A | unresolved (check: rests 192, 0 not declared disjoint) | 36672 | 3.47 | 1, 47461 B | 14.1 | 0.72 (1916) | 21.0 | 67 |
| 256 | A | unresolved (check: rests 256, 0 not declared disjoint) | 65280 | 3.72 | 1, 63461 B | 19.8 | 0.78 (2556) | 28.0 | 72 |
| 384 | A | unresolved (check: rests 384, 0 not declared disjoint) | 147072 | 5.24 | 1, 95614 B | 40.2 | 1.00 (3836) | 52.5 | 73 |
| 512 | A | unresolved (check: rests 512, 0 not declared disjoint) | 261632 | 6.73 | 1, 127998 B | 59.9 | 1.27 (5116) | 77.2 | 73 |
| 768 | A | unresolved (check: rests 768, 0 not declared disjoint) | 589056 | 8.28 | 1, 192766 B | 123.1 | 1.93 (7676) | 151.5 | 83 |
| 1024 | A | unresolved (check: rests 1024, 0 not declared disjoint) | 1047552 | 10.8 | 1, 257634 B | 214.2 | 2.59 (10236) | 257.8 | 86 |
| 1536 | A | unresolved (check: rests 1536, 0 not declared disjoint) | 2357760 | 17.7 | 1, 389218 B | 473.9 | 3.76 (15356) | 589.0 | 106 |
| 2048 | A | unresolved (check: rests 2048, 0 not declared disjoint) | 4192256 | 21.4 | 1, 520802 B | 811.8 | 4.59 (20476) | 912.2 | 109 |
| 3072 | A | unresolved (check: rests 3072, 0 not declared disjoint) | 9434112 | 43.7 | 1, 783970 B | 1854 | 6.71 (30716) | 2053 | 151 |
| 4096 | A | unresolved (check: rests 4096, 0 not declared disjoint) | 16773120 | 66.4 | 1, 1049427 B | 3623 | 10.8 (40956) | 3940 | 158 |
| 6144 | A | unresolved (check: rests 6144, 0 not declared disjoint) | 37742592 | 114.8 | 1, 1581907 B | 7496 | 14.9 (61436) | 8150 | 188 |
| 8192 | A | unresolved (check: rests 8192, 0 not declared disjoint) | 67100672 | 183.2 | 1, 2114387 B | 13250 | 20.0 (81916) | 14371 | 196 |
| 12288 | A | unresolved (check: rests 12288, 0 not declared disjoint) | 150982656 | 337.2 | 1, 3188503 B | 31581 | 33.0 (122876) | 34030 | 246 |
| 16384 | A | limit: time 60 s |  |  |  |  |  |  |  |
| 1 | B | unresolved (no certificate: rests 1, 0 not declared disjoint) | 0.00 | 21.4 | 0 leaves,  B | 0.96 |  | 23.0 | 69 |
| 2 | B | unresolved (no certificate: rests 2, 0 not declared disjoint) | 2.00 | 21.7 | 1 leaves,  B | 0.68 |  | 23.1 | 69 |
| 3 | B | unresolved (no certificate: rests 3, 0 not declared disjoint) | 6.00 | 21.7 | 2 leaves,  B | 0.53 |  | 22.9 | 69 |
| 4 | B | unresolved (no certificate: rests 4, 0 not declared disjoint) | 12.0 | 21.4 | 3 leaves,  B | 0.53 |  | 22.9 | 69 |
| 5 | B | unresolved (no certificate: rests 5, 0 not declared disjoint) | 20.0 | 20.9 | 4 leaves,  B | 0.67 |  | 22.8 | 69 |
| 6 | B | unresolved (no certificate: rests 6, 0 not declared disjoint) | 30.0 | 22.1 | 5 leaves,  B | 0.71 |  | 24.1 | 70 |
| 8 | B | unresolved (no certificate: rests 8, 0 not declared disjoint) | 56.0 | 21.1 | 7 leaves,  B | 1.04 |  | 23.7 | 69 |
| 12 | B | unresolved (no certificate: rests 12, 0 not declared disjoint) | 132.0 | 23.4 | 11 leaves,  B | 1.27 |  | 26.2 | 69 |
| 16 | B | unresolved (no certificate: rests 16, 0 not declared disjoint) | 240.0 | 22.3 | 15 leaves,  B | 1.43 |  | 25.3 | 70 |
| 24 | B | unresolved (no certificate: rests 24, 0 not declared disjoint) | 552.0 | 23.6 | 23 leaves,  B | 1.89 |  | 26.9 | 69 |
| 32 | B | unresolved (no certificate: rests 32, 0 not declared disjoint) | 992.0 | 23.1 | 31 leaves,  B | 1.97 |  | 26.6 | 70 |
| 48 | B | unresolved (no certificate: rests 48, 0 not declared disjoint) | 2256 | 22.5 | 47 leaves,  B | 3.07 |  | 27.9 | 70 |
| 64 | B | unresolved (no certificate: rests 64, 0 not declared disjoint) | 4032 | 23.4 | 63 leaves,  B | 3.99 |  | 29.6 | 71 |
| 96 | B | unresolved (no certificate: rests 96, 0 not declared disjoint) | 9120 | 24.2 | 95 leaves,  B | 6.20 |  | 33.2 | 70 |
| 128 | B | unresolved (no certificate: rests 128, 0 not declared disjoint) | 16256 | 26.2 | 127 leaves,  B | 8.78 |  | 38.8 | 71 |
| 192 | B | unresolved (no certificate: rests 192, 0 not declared disjoint) | 36672 | 28.3 | 191 leaves,  B | 14.1 |  | 47.3 | 73 |
| 256 | B | unresolved (no certificate: rests 256, 0 not declared disjoint) | 65280 | 30.4 | 255 leaves,  B | 21.8 |  | 58.8 | 78 |
| 384 | B | unresolved (no certificate: rests 384, 0 not declared disjoint) | 147072 | 40.0 | 383 leaves,  B | 43.2 |  | 92.6 | 83 |
| 512 | B | unresolved (no certificate: rests 512, 0 not declared disjoint) | 261632 | 60.0 | 511 leaves,  B | 65.3 |  | 139.3 | 90 |
| 768 | B | unresolved (no certificate: rests 768, 0 not declared disjoint) | 589056 | 102.9 | 767 leaves,  B | 138.5 |  | 265.7 | 116 |
| 1024 | B | unresolved (no certificate: rests 1024, 0 not declared disjoint) | 1047552 | 232.8 | 1023 leaves,  B | 236.1 |  | 506.4 | 143 |
| 1536 | B | unresolved (no certificate: rests 1536, 0 not declared disjoint) | 2357760 | 558.7 | 1535 leaves,  B | 531.4 |  | 1163 | 219 |
| 2048 | B | unresolved (no certificate: rests 2048, 0 not declared disjoint) | 4192256 | 1031 | 2047 leaves,  B | 1009 |  | 2128 | 260 |
| 3072 | B | unresolved (no certificate: rests 3072, 0 not declared disjoint) | 9434112 | 2461 | 3071 leaves,  B | 2152 |  | 4787 | 387 |
| 4096 | B | unresolved (no certificate: rests 4096, 0 not declared disjoint) | 16773120 | 4584 | 4095 leaves,  B | 3880 |  | 8746 | 473 |
| 6144 | B | unresolved (no certificate: rests 6144, 0 not declared disjoint) | 37742592 | 10005 | 6143 leaves,  B | 8508 |  | 19091 | 497 |
| 8192 | B | unresolved (no certificate: rests 8192, 0 not declared disjoint) | 67100672 | 17821 | 8191 leaves,  B | 15320 |  | 34142 | 530 |
| 12288 | B | limit: time 60 s |  |  |  leaves,  B |  |  |  |  |

### star-unlacked

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | unresolved (no certificate) | 1.00 | 37.6 | 1 entries, 279 B | 0.04 | 0.06 (2) | 38.2 | 73 |
| 2 | E | unresolved (no certificate) | 2.58 | 38.9 | 4 entries, 2469 B | 0.14 | 0.04 (6) | 40.5 | 76 |
| 3 | E | unresolved (no certificate) | 6.32 | 44.1 | 64 entries, 65089 B | 2.19 | 0.13 (80) | 48.1 | 78 |
| 4 | E | unresolved (no certificate) | 12.2 | 254.2 | 4096 entries, 6066177 B | 106.5 | 3.37 (4608) | 402.7 | 123 |
| 5 | E | limit: time 60 s |  |  |  entries,  B |  |  |  |  |
| 1 | A | unresolved (check: row 0 may hold f1) | 1.00 | 0.42 | 1, 237 B | 0.94 | 0.11 (6) | 1.66 | 55 |
| 2 | A | unresolved (check: row 0 may hold f2) | 2.58 | 0.71 | 1, 473 B | 0.59 | 0.09 (16) | 1.65 | 55 |
| 3 | A | unresolved (check: row 0 may hold f3) | 6.32 | 0.74 | 1, 709 B | 0.64 | 0.10 (26) | 1.76 | 56 |
| 4 | A | unresolved (check: row 0 may hold f4) | 12.2 | 0.98 | 1, 948 B | 0.56 | 0.10 (36) | 1.97 | 55 |
| 5 | A | unresolved (check: row 0 may hold f5) | 20.1 | 0.98 | 1, 1187 B | 0.65 | 0.11 (46) | 2.06 | 55 |
| 6 | A | unresolved (check: row 0 may hold f6) | 30.0 | 0.67 | 1, 1426 B | 0.66 | 0.12 (56) | 2.02 | 55 |
| 8 | A | unresolved (check: row 0 may hold f8) | 56.0 | 0.62 | 1, 1904 B | 0.99 | 0.13 (76) | 2.64 | 57 |
| 12 | A | unresolved (check: row 0 may hold f12) | 132.0 | 0.68 | 1, 2872 B | 0.97 | 0.15 (116) | 3.74 | 57 |
| 16 | A | unresolved (check: row 0 may hold f16) | 240.0 | 0.79 | 1, 3844 B | 1.26 | 0.22 (156) | 21.9 | 80 |
| 24 | A | unresolved (check: row 0 may hold f24) | n/c | 1.02 | 1, 5788 B | 1.66 | 0.33 (236) | 3.44 | 58 |
| 32 | A | unresolved (check: row 0 may hold f32) | n/c | 1.25 | 1, 7732 B | 2.12 | 0.41 (316) | 4.25 | 60 |
| 48 | A | unresolved (check: row 0 may hold f48) | n/c | 1.31 | 1, 11665 B | 3.21 | 0.30 (476) | 5.58 | 64 |
| 64 | A | unresolved (check: row 0 may hold f64) | n/c | 1.46 | 1, 15601 B | 4.30 | 0.34 (636) | 6.92 | 65 |
| 96 | A | unresolved (check: row 0 may hold f96) | n/c | 2.17 | 1, 23473 B | 6.85 | 0.57 (956) | 11.0 | 65 |
| 128 | A | unresolved (check: row 0 may hold f128) | n/c | 2.41 | 1, 31461 B | 7.48 | 0.47 (1276) | 12.1 | 65 |
| 192 | A | unresolved (check: row 0 may hold f192) | n/c | 2.94 | 1, 47461 B | 13.0 | 0.75 (1916) | 19.5 | 67 |
| 256 | A | unresolved (check: row 0 may hold f256) | n/c | 3.46 | 1, 63461 B | 20.3 | 0.72 (2556) | 27.6 | 72 |
| 384 | A | unresolved (check: row 0 may hold f384) | n/c | 5.05 | 1, 95614 B | 39.4 | 1.03 (3836) | 51.1 | 73 |
| 512 | A | unresolved (check: row 0 may hold f512) | n/c | 6.10 | 1, 127998 B | 59.1 | 1.27 (5116) | 75.4 | 74 |
| 768 | A | unresolved (check: row 0 may hold f768) | n/c | 8.83 | 1, 192766 B | 125.1 | 1.88 (7676) | 153.0 | 84 |
| 1024 | A | unresolved (check: row 0 may hold f1024) | n/c | 12.1 | 1, 257634 B | 208.3 | 2.50 (10236) | 252.2 | 86 |
| 1536 | A | unresolved (check: row 0 may hold f1536) | n/c | 17.0 | 1, 389218 B | 466.7 | 3.45 (15356) | 547.7 | 106 |
| 2048 | A | unresolved (check: row 0 may hold f2048) | n/c | 22.4 | 1, 520802 B | 821.1 | 4.51 (20476) | 922.5 | 109 |
| 3072 | A | unresolved (check: row 0 may hold f3072) | n/c | 46.1 | 1, 783970 B | 1868 | 6.82 (30716) | 2075 | 151 |
| 4096 | A | unresolved (check: row 0 may hold f4096) | n/c | 64.2 | 1, 1049427 B | 3249 | 9.42 (40956) | 3567 | 159 |
| 6144 | A | unresolved (check: row 0 may hold f6144) | n/c | 111.6 | 1, 1581907 B | 7548 | 15.2 (61436) | 8202 | 188 |
| 8192 | A | unresolved (check: row 0 may hold f8192) | n/c | 178.9 | 1, 2114387 B | 13145 | 19.5 (81916) | 14280 | 196 |
| 12288 | A | unresolved (check: row 0 may hold f12288) | n/c | 332.1 | 1, 3188503 B | 30888 | 31.2 (122876) | 33265 | 245 |
| 16384 | A | unresolved (check: row 0 may hold f16384) | n/c | 563.3 | 1, 4269847 B | 54412 | 44.2 (163836) | 58716 | 343 |
| 32768 | A | limit: time 60 s |  |  |  |  |  |  |  |
| 1 | B | unresolved (no certificate: row 0 may hold f1) | 1.00 | 40.6 | 1 leaves,  B | 0.92 |  | 42.4 | 76 |
| 2 | B | unresolved (no certificate: row 0 may hold f2) | 2.58 | 43.9 | 2 leaves,  B | 0.69 |  | 45.5 | 77 |
| 3 | B | unresolved (no certificate: row 0 may hold f3) | 6.32 | 41.7 | 3 leaves,  B | 0.58 |  | 43.5 | 76 |
| 4 | B | unresolved (no certificate: row 0 may hold f4) | 12.2 | 41.3 | 4 leaves,  B | 0.65 |  | 43.5 | 77 |
| 5 | B | unresolved (no certificate: row 0 may hold f5) | 20.1 | 39.3 | 5 leaves,  B | 0.72 |  | 41.5 | 77 |
| 6 | B | unresolved (no certificate: row 0 may hold f6) | 30.0 | 39.2 | 6 leaves,  B | 0.75 |  | 41.6 | 76 |
| 8 | B | unresolved (no certificate: row 0 may hold f8) | 56.0 | 40.0 | 8 leaves,  B | 1.25 |  | 42.7 | 77 |
| 12 | B | unresolved (no certificate: row 0 may hold f12) | 132.0 | 41.2 | 12 leaves,  B | 1.14 |  | 45.0 | 77 |
| 16 | B | unresolved (no certificate: row 0 may hold f16) | 240.0 | 40.9 | 16 leaves,  B | 1.22 |  | 61.7 | 110 |
| 24 | B | unresolved (no certificate: row 0 may hold f24) | n/c | 41.9 | 24 leaves,  B | 1.56 |  | 44.9 | 77 |
| 32 | B | unresolved (no certificate: row 0 may hold f32) | n/c | 42.0 | 32 leaves,  B | 2.40 |  | 46.1 | 77 |
| 48 | B | unresolved (no certificate: row 0 may hold f48) | n/c | 42.5 | 48 leaves,  B | 3.14 |  | 48.0 | 78 |
| 64 | B | unresolved (no certificate: row 0 may hold f64) | n/c | 43.2 | 64 leaves,  B | 4.49 |  | 50.3 | 76 |
| 96 | B | unresolved (no certificate: row 0 may hold f96) | n/c | 44.3 | 96 leaves,  B | 6.33 |  | 54.1 | 78 |
| 128 | B | unresolved (no certificate: row 0 may hold f128) | n/c | 50.6 | 128 leaves,  B | 8.97 |  | 63.4 | 78 |
| 192 | B | unresolved (no certificate: row 0 may hold f192) | n/c | 51.8 | 192 leaves,  B | 14.4 |  | 71.8 | 80 |
| 256 | B | unresolved (no certificate: row 0 may hold f256) | n/c | 58.7 | 256 leaves,  B | 23.5 |  | 89.5 | 86 |
| 384 | B | unresolved (no certificate: row 0 may hold f384) | n/c | 77.4 | 384 leaves,  B | 43.8 |  | 131.2 | 90 |
| 512 | B | unresolved (no certificate: row 0 may hold f512) | n/c | 117.3 | 512 leaves,  B | 67.3 |  | 199.1 | 101 |
| 768 | B | unresolved (no certificate: row 0 may hold f768) | n/c | 209.5 | 768 leaves,  B | 139.3 |  | 374.5 | 126 |
| 1024 | B | unresolved (no certificate: row 0 may hold f1024) | n/c | 420.5 | 1024 leaves,  B | 239.2 |  | 698.4 | 155 |
| 1536 | B | unresolved (no certificate: row 0 may hold f1536) | n/c | 1163 | 1536 leaves,  B | 537.8 |  | 1776 | 255 |
| 2048 | B | unresolved (no certificate: row 0 may hold f2048) | n/c | 2168 | 2048 leaves,  B | 934.2 |  | 3224 | 261 |
| 3072 | B | unresolved (no certificate: row 0 may hold f3072) | n/c | 4945 | 3072 leaves,  B | 2145 |  | 7268 | 391 |
| 4096 | B | unresolved (no certificate: row 0 may hold f4096) | n/c | 9269 | 4096 leaves,  B | 3785 |  | 13337 | 447 |
| 6144 | B | unresolved (no certificate: row 0 may hold f6144) | n/c | 20987 | 6144 leaves,  B | 8636 |  | 30211 | 498 |
| 8192 | B | unresolved (no certificate: row 0 may hold f8192) | n/c | 34089 | 8192 leaves,  B | 15779 |  | 50893 | 519 |
| 12288 | B | limit: time 60 s |  |  |  leaves,  B |  |  |  |  |

### star-cross

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 2 | E | unresolved (no certificate) | 2.00 | 1.70 | 0 entries, 0 B | 0.00 | 0.07 (4) | 2.30 | 56 |
| 3 | E | unresolved (no certificate) | 6.00 | 6.72 | 0 entries, 0 B | 0.00 | 0.16 (64) | 7.96 | 59 |
| 4 | E | unresolved (no certificate) | 12.0 | 151.5 | 0 entries, 0 B | 0.00 | 4.08 (4096) | 160.4 | 71 |
| 5 | E | unresolved (no certificate) | 20.0 | 34960 | 0 entries, 0 B | 0.00 | 1005 (1048576) | 36941 | 219 |
| 6 | E | unresolved (budget: patterns) | 30.0 |  |  entries,  B |  |  | 0.25 | 54 |
| 2 | A | unresolved (search: extra on open side) | 2.00 | 0.43 |  |  |  | 0.94 | 55 |
| 3 | A | unresolved (search: extra on open side) | 6.00 | 0.89 |  |  |  | 1.14 | 55 |
| 4 | A | unresolved (search: extra on open side) | 12.0 | 0.91 |  |  |  | 1.17 | 55 |
| 5 | A | unresolved (search: extra on open side) | 20.0 | 0.86 |  |  |  | 1.13 | 55 |
| 6 | A | unresolved (search: extra on open side) | 30.0 | 0.92 |  |  |  | 1.21 | 55 |
| 8 | A | unresolved (search: extra on open side) | 56.0 | 0.66 |  |  |  | 1.33 | 55 |
| 12 | A | unresolved (search: extra on open side) | 132.0 | 0.60 |  |  |  | 1.47 | 55 |
| 16 | A | unresolved (search: extra on open side) | 240.0 | 0.58 |  |  |  | 1.36 | 55 |
| 24 | A | unresolved (search: extra on open side) | 552.0 | 0.58 |  |  |  | 1.19 | 55 |
| 32 | A | unresolved (search: extra on open side) | 992.0 | 0.58 |  |  |  | 1.17 | 55 |
| 48 | A | unresolved (search: extra on open side) | 2256 | 0.89 |  |  |  | 1.61 | 56 |
| 64 | A | unresolved (search: extra on open side) | 4032 | 0.90 |  |  |  | 1.69 | 56 |
| 96 | A | unresolved (search: extra on open side) | 9120 | 0.74 |  |  |  | 2.16 | 56 |
| 128 | A | unresolved (search: extra on open side) | 16256 | 0.93 |  |  |  | 2.66 | 57 |
| 192 | A | unresolved (search: extra on open side) | 36672 | 1.22 |  |  |  | 4.08 | 62 |
| 256 | A | unresolved (search: extra on open side) | 65280 | 1.61 |  |  |  | 4.86 | 63 |
| 384 | A | unresolved (search: extra on open side) | 147072 | 1.85 |  |  |  | 7.91 | 64 |
| 512 | A | unresolved (search: extra on open side) | 261632 | 1.98 |  |  |  | 10.7 | 64 |
| 768 | A | unresolved (search: extra on open side) | 589056 | 3.40 |  |  |  | 21.7 | 69 |
| 1024 | A | unresolved (search: extra on open side) | 1047552 | 4.64 |  |  |  | 34.4 | 71 |
| 1536 | A | unresolved (search: extra on open side) | 2357760 | 7.12 |  |  |  | 69.4 | 73 |
| 2048 | A | unresolved (search: extra on open side) | 4192256 | 10.7 |  |  |  | 87.5 | 82 |
| 3072 | A | unresolved (search: extra on open side) | 9434112 | 21.3 |  |  |  | 166.2 | 88 |
| 4096 | A | unresolved (search: extra on open side) | 16773120 | 33.8 |  |  |  | 275.0 | 91 |
| 6144 | A | unresolved (search: extra on open side) | 37742592 | 80.4 |  |  |  | 613.0 | 117 |
| 8192 | A | unresolved (search: extra on open side) | 67100672 | 135.9 |  |  |  | 1069 | 121 |
| 12288 | A | unresolved (search: extra on open side) | 150982656 | 267.1 |  |  |  | 2292 | 157 |
| 16384 | A | unresolved (search: extra on open side) | 268419072 | 468.3 |  |  |  | 4163 | 194 |
| 32768 | A | unresolved (search: extra on open side) | 1073709056 | 1865 |  |  |  | 16481 | 292 |
| 2 | B | unresolved (no certificate: budget: search) | 2.00 | 1.17 | 0 leaves,  B | 0.00 |  | 1.85 | 55 |

### dep

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 2.00 | 1.08 | 4 entries, 547 B | 0.41 | 0.01 (4) | 2.04 | 55 |
| 2 | E | valid | 4.00 | 2.01 | 16 entries, 4369 B | 0.23 | 0.07 (16) | 3.04 | 56 |
| 3 | E | valid | 6.00 | 4.19 | 64 entries, 26209 B | 1.10 | 0.10 (64) | 6.38 | 59 |
| 4 | E | valid | 8.00 | 9.61 | 256 entries, 140545 B | 3.20 | 0.24 (256) | 15.5 | 63 |
| 6 | E | valid | 12.0 | 119.1 | 4096 entries, 3391489 B | 56.4 | 2.75 (4096) | 203.7 | 89 |
| 8 | E | valid | 16.0 | 2028 | 65536 entries, 72548353 B | 1109 | 46.6 (65536) | 3666 | 279 |
| 12 | E | unresolved (budget: patterns) | 24.0 |  |  entries,  B |  |  | 0.20 | 54 |
| 1 | A | unresolved (check: row 0 may hold a) | 2.00 | 0.39 | 1, 98 B | 0.33 | 0.07 (2) | 0.97 | 54 |
| 2 | A | unresolved (check: row 0 may hold a) | 4.00 | 0.41 | 1, 195 B | 0.46 | 0.43 (2) | 1.52 | 55 |
| 3 | A | unresolved (check: row 0 may hold a) | 6.00 | 0.44 | 1, 292 B | 0.80 | 0.07 (2) | 1.51 | 55 |
| 4 | A | unresolved (check: row 0 may hold a) | 8.00 | 0.74 | 1, 392 B | 0.44 | 0.07 (2) | 1.46 | 55 |
| 6 | A | unresolved (check: row 0 may hold a) | 12.0 | 0.88 | 1, 592 B | 0.32 | 0.07 (2) | 1.47 | 55 |
| 8 | A | unresolved (check: row 0 may hold a) | 16.0 | 0.93 | 1, 792 B | 0.32 | 0.07 (2) | 1.53 | 55 |
| 12 | A | unresolved (check: row 0 may hold a) | 24.0 | 1.06 | 1, 1191 B | 0.34 | 0.07 (2) | 1.70 | 55 |
| 16 | A | unresolved (check: row 0 may hold a) | 32.0 | 1.08 | 1, 1591 B | 0.33 | 0.07 (2) | 1.72 | 55 |
| 32 | A | unresolved (check: row 0 may hold a) | 64.0 | 0.88 | 1, 3191 B | 0.32 | 0.11 (2) | 1.88 | 55 |
| 64 | A | unresolved (check: row 0 may hold a) | 128.0 | 1.29 | 1, 6484 B | 0.33 | 0.07 (2) | 2.02 | 56 |
| 128 | A | unresolved (check: row 0 may hold a) | 256.0 | 1.88 | 1, 13075 B | 0.35 | 0.08 (2) | 2.75 | 57 |
| 1 | B | valid | 2.00 | 1.78 | 2 leaves, 317 B | 0.68 | 0.28 (12, 3 nodes) | 3.12 | 56 |
| 2 | B | valid | 4.00 | 1.93 | 4 leaves, 633 B | 0.99 | 0.34 (24, 6 nodes) | 3.68 | 56 |
| 3 | B | valid | 6.00 | 1.98 | 6 leaves, 949 B | 0.97 | 0.32 (36, 9 nodes) | 3.69 | 57 |
| 4 | B | valid | 8.00 | 2.54 | 8 leaves, 1271 B | 0.83 | 0.39 (48, 12 nodes) | 4.27 | 57 |
| 6 | B | valid | 12.0 | 2.88 | 12 leaves, 1915 B | 0.88 | 0.41 (72, 18 nodes) | 5.14 | 57 |
| 8 | B | valid | 16.0 | 3.02 | 16 leaves, 2559 B | 0.91 | 0.70 (96, 24 nodes) | 5.22 | 57 |
| 12 | B | valid | 24.0 | 3.55 | 24 leaves, 3853 B | 1.20 | 1.02 (144, 36 nodes) | 6.55 | 59 |
| 16 | B | valid | 32.0 | 4.13 | 32 leaves, 5157 B | 1.47 | 1.45 (192, 48 nodes) | 7.70 | 60 |
| 32 | B | valid | 64.0 | 5.90 | 64 leaves, 10373 B | 2.56 | 0.80 (384, 96 nodes) | 10.4 | 64 |
| 64 | B | valid | 128.0 | 10.5 | 128 leaves, 20991 B | 4.09 | 1.11 (768, 192 nodes) | 16.7 | 65 |
| 128 | B | valid | 256.0 | 21.6 | 256 leaves, 42349 B | 7.47 | 2.00 (1536, 384 nodes) | 32.7 | 66 |

### divide

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 1.00 | 1.04 | 2 entries, 248 B | 0.04 | 0.01 (2) | 1.54 | 55 |
| 2 | E | valid | 2.00 | 0.85 | 4 entries, 561 B | 0.33 | 0.01 (4) | 1.68 | 55 |
| 3 | E | valid | 3.00 | 1.02 | 8 entries, 1253 B | 0.46 | 0.03 (8) | 2.03 | 55 |
| 4 | E | valid | 4.00 | 1.71 | 16 entries, 2769 B | 0.15 | 0.04 (16) | 2.61 | 56 |
| 6 | E | valid | 6.00 | 2.76 | 64 entries, 13185 B | 0.55 | 0.10 (64) | 4.31 | 57 |
| 8 | E | valid | 8.00 | 6.41 | 256 entries, 61185 B | 1.90 | 0.28 (256) | 10.2 | 63 |
| 10 | E | valid | 10.0 | 17.3 | 1024 entries, 280065 B | 7.08 | 1.15 (1024) | 29.8 | 70 |
| 12 | E | valid | 12.0 | 62.2 | 4096 entries, 1267713 B | 26.9 | 3.38 (4096) | 107.4 | 91 |
| 14 | E | valid | 14.0 | 235.8 | 16384 entries, 5660673 B | 107.2 | 15.8 (16384) | 416.3 | 161 |
| 16 | E | valid | 16.0 | 1006 | 65536 entries, 25001985 B | 482.5 | 60.6 (65536) | 1786 | 243 |
| 1 | A | valid | 1.00 | 0.39 | 1, 98 B | 0.26 | 0.04 (1) | 0.87 | 54 |
| 2 | A | valid | 2.00 | 0.38 | 1, 98 B | 0.27 | 0.03 (1) | 0.86 | 54 |
| 3 | A | valid | 3.00 | 0.38 | 1, 98 B | 0.27 | 0.03 (1) | 0.87 | 54 |
| 4 | A | valid | 4.00 | 0.41 | 1, 98 B | 0.39 | 0.03 (1) | 1.04 | 54 |
| 6 | A | valid | 6.00 | 0.38 | 1, 98 B | 0.38 | 0.03 (1) | 1.24 | 55 |
| 8 | A | valid | 8.00 | 0.40 | 1, 98 B | 0.64 | 0.03 (1) | 1.25 | 55 |
| 10 | A | valid | 10.0 | 0.42 | 1, 98 B | 0.77 | 0.04 (1) | 1.43 | 55 |
| 12 | A | valid | 12.0 | 0.40 | 1, 98 B | 0.65 | 0.03 (1) | 1.27 | 55 |
| 14 | A | valid | 14.0 | 0.41 | 1, 98 B | 0.73 | 0.03 (1) | 1.36 | 55 |
| 16 | A | valid | 16.0 | 0.41 | 1, 98 B | 0.75 | 0.03 (1) | 1.38 | 55 |
| 1 | B | valid | 1.00 | 0.38 | 1 leaves, 119 B | 0.34 | 0.23 (1, 1 nodes) | 1.28 | 55 |
| 2 | B | valid | 2.00 | 0.38 | 1 leaves, 119 B | 0.35 | 0.21 (1, 1 nodes) | 1.53 | 55 |
| 3 | B | valid | 3.00 | 0.37 | 1 leaves, 119 B | 0.35 | 0.24 (1, 1 nodes) | 1.60 | 55 |
| 4 | B | valid | 4.00 | 0.38 | 1 leaves, 119 B | 0.66 | 0.23 (1, 1 nodes) | 1.61 | 55 |
| 6 | B | valid | 6.00 | 0.39 | 1 leaves, 119 B | 0.69 | 0.23 (1, 1 nodes) | 1.65 | 55 |
| 8 | B | valid | 8.00 | 0.39 | 1 leaves, 119 B | 0.68 | 0.24 (1, 1 nodes) | 1.68 | 55 |
| 10 | B | valid | 10.0 | 0.42 | 1 leaves, 119 B | 0.46 | 0.26 (1, 1 nodes) | 1.83 | 55 |
| 12 | B | valid | 12.0 | 0.71 | 1 leaves, 119 B | 0.39 | 0.26 (1, 1 nodes) | 1.70 | 55 |
| 14 | B | valid | 14.0 | 0.70 | 1 leaves, 119 B | 0.29 | 0.26 (1, 1 nodes) | 1.69 | 55 |
| 16 | B | valid | 16.0 | 0.71 | 1 leaves, 119 B | 0.28 | 0.25 (1, 1 nodes) | 1.67 | 55 |

### divide2

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 2.00 | 0.88 | 4 entries, 553 B | 0.48 | 0.01 (4) | 1.91 | 55 |
| 2 | E | valid | 3.00 | 1.10 | 8 entries, 1237 B | 0.40 | 0.03 (8) | 2.08 | 55 |
| 3 | E | valid | 4.00 | 1.75 | 16 entries, 2737 B | 0.16 | 0.04 (16) | 2.64 | 56 |
| 4 | E | valid | 5.00 | 2.10 | 32 entries, 6001 B | 0.27 | 0.06 (32) | 3.20 | 56 |
| 6 | E | valid | 7.00 | 4.34 | 128 entries, 28225 B | 0.99 | 0.17 (128) | 6.71 | 62 |
| 8 | E | valid | 9.00 | 10.4 | 512 entries, 129793 B | 3.31 | 0.48 (512) | 16.8 | 68 |
| 10 | E | valid | 11.0 | 32.6 | 2048 entries, 589825 B | 13.9 | 1.76 (2048) | 56.1 | 80 |
| 12 | E | valid | 13.0 | 130.6 | 8192 entries, 2654209 B | 57.5 | 7.85 (8192) | 226.1 | 113 |
| 14 | E | valid | 15.0 | 477.4 | 32768 entries, 11796481 B | 217.2 | 28.7 (32768) | 839.0 | 178 |
| 16 | E | valid | 17.0 | 1945 | 131072 entries, 51904513 B | 922.3 | 128.7 (131072) | 3481 | 350 |
| 1 | A | unresolved (check: row 0 may hold c) | 2.00 | 0.42 | 1, 98 B | 0.41 | 0.07 (2) | 1.09 | 54 |
| 2 | A | unresolved (check: row 0 may hold c) | 3.00 | 0.39 | 1, 98 B | 0.35 | 0.20 (2) | 1.12 | 55 |
| 3 | A | unresolved (check: row 0 may hold c) | 4.00 | 0.39 | 1, 98 B | 0.45 | 0.06 (2) | 1.10 | 55 |
| 4 | A | unresolved (check: row 0 may hold c) | 5.00 | 0.38 | 1, 98 B | 0.45 | 0.07 (2) | 1.39 | 55 |
| 6 | A | unresolved (check: row 0 may hold c) | 7.00 | 0.38 | 1, 98 B | 0.80 | 0.09 (2) | 1.48 | 55 |
| 8 | A | unresolved (check: row 0 may hold c) | 9.00 | 0.43 | 1, 98 B | 0.83 | 0.09 (2) | 1.55 | 55 |
| 10 | A | unresolved (check: row 0 may hold c) | 11.0 | 0.43 | 1, 98 B | 0.85 | 0.07 (2) | 1.54 | 55 |
| 12 | A | unresolved (check: row 0 may hold c) | 13.0 | 0.40 | 1, 98 B | 0.79 | 0.10 (2) | 1.50 | 55 |
| 14 | A | unresolved (check: row 0 may hold c) | 15.0 | 0.41 | 1, 98 B | 0.78 | 0.09 (2) | 1.47 | 55 |
| 16 | A | unresolved (check: row 0 may hold c) | 17.0 | 0.49 | 1, 98 B | 0.88 | 0.07 (2) | 1.65 | 55 |
| 1 | B | valid | 2.00 | 1.67 | 2 leaves, 317 B | 0.65 | 0.28 (12, 3 nodes) | 2.98 | 56 |
| 2 | B | valid | 3.00 | 0.89 | 2 leaves, 317 B | 0.88 | 0.30 (10, 3 nodes) | 2.43 | 55 |
| 3 | B | valid | 4.00 | 0.93 | 2 leaves, 317 B | 0.95 | 0.31 (10, 3 nodes) | 2.57 | 55 |
| 4 | B | valid | 5.00 | 0.85 | 2 leaves, 317 B | 0.88 | 0.27 (10, 3 nodes) | 2.36 | 55 |
| 6 | B | valid | 7.00 | 0.91 | 2 leaves, 317 B | 0.95 | 0.29 (10, 3 nodes) | 2.53 | 55 |
| 8 | B | valid | 9.00 | 0.99 | 2 leaves, 317 B | 0.88 | 0.31 (10, 3 nodes) | 2.60 | 55 |
| 10 | B | valid | 11.0 | 1.20 | 2 leaves, 317 B | 0.67 | 0.32 (10, 3 nodes) | 2.59 | 56 |
| 12 | B | valid | 13.0 | 1.31 | 2 leaves, 317 B | 0.73 | 0.32 (10, 3 nodes) | 2.78 | 56 |
| 14 | B | valid | 15.0 | 1.22 | 2 leaves, 317 B | 0.59 | 0.31 (10, 3 nodes) | 2.67 | 56 |
| 16 | B | valid | 17.0 | 1.04 | 2 leaves, 317 B | 0.59 | 0.31 (10, 3 nodes) | 2.73 | 55 |

### divide3

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 1 | E | valid | 1.00 | 0.82 | 2 entries, 247 B | 0.33 | 0.01 (2) | 1.67 | 55 |
| 2 | E | valid | 2.00 | 1.22 | 4 entries, 558 B | 0.09 | 0.02 (4) | 1.87 | 55 |
| 3 | E | valid | 3.00 | 1.41 | 8 entries, 1246 B | 0.11 | 0.04 (8) | 2.21 | 55 |
| 4 | E | valid | 4.00 | 2.21 | 16 entries, 2754 B | 0.29 | 0.05 (16) | 3.32 | 56 |
| 6 | E | valid | 6.00 | 3.35 | 64 entries, 13122 B | 0.77 | 0.22 (64) | 5.22 | 57 |
| 8 | E | valid | 8.00 | 7.69 | 256 entries, 60930 B | 2.38 | 0.23 (256) | 12.4 | 66 |
| 10 | E | valid | 10.0 | 20.7 | 1024 entries, 279042 B | 8.75 | 1.34 (1024) | 35.3 | 72 |
| 12 | E | valid | 12.0 | 75.4 | 4096 entries, 1263618 B | 34.5 | 5.74 (4096) | 130.6 | 91 |
| 14 | E | valid | 14.0 | 274.9 | 16384 entries, 5644290 B | 131.8 | 14.8 (16384) | 476.6 | 162 |
| 16 | E | valid | 16.0 | 1144 | 65536 entries, 24936450 B | 588.2 | 63.8 (65536) | 2026 | 243 |
| 1 | A | unresolved (check: row 0 may hold a1) | 1.00 | 0.38 | 1, 98 B | 0.47 | 0.06 (2) | 1.10 | 54 |
| 2 | A | unresolved (check: row 0 may hold a1) | 2.00 | 0.40 | 1, 98 B | 0.45 | 0.07 (2) | 1.11 | 55 |
| 3 | A | unresolved (check: row 0 may hold a1) | 3.00 | 0.42 | 1, 98 B | 0.48 | 0.07 (2) | 1.16 | 55 |
| 4 | A | unresolved (check: row 0 may hold a1) | 4.00 | 0.41 | 1, 98 B | 0.47 | 0.07 (2) | 1.15 | 55 |
| 6 | A | unresolved (check: row 0 may hold a1) | 6.00 | 0.40 | 1, 98 B | 0.49 | 0.43 (2) | 1.53 | 55 |
| 8 | A | unresolved (check: row 0 may hold a1) | 8.00 | 0.41 | 1, 98 B | 0.78 | 0.08 (2) | 1.48 | 55 |
| 10 | A | unresolved (check: row 0 may hold a1) | 10.0 | 0.40 | 1, 98 B | 0.85 | 0.08 (2) | 1.54 | 55 |
| 12 | A | unresolved (check: row 0 may hold a1) | 12.0 | 0.43 | 1, 98 B | 0.80 | 0.09 (2) | 1.54 | 55 |
| 14 | A | unresolved (check: row 0 may hold a1) | 14.0 | 0.42 | 1, 98 B | 0.73 | 0.08 (2) | 1.45 | 55 |
| 16 | A | unresolved (check: row 0 may hold a1) | 16.0 | 0.43 | 1, 98 B | 0.79 | 0.08 (2) | 1.56 | 55 |
| 1 | B | valid | 1.00 | 1.89 | 2 leaves, 323 B | 0.62 | 0.28 (13, 3 nodes) | 3.44 | 56 |
| 2 | B | valid | 2.00 | 14.4 | 4 leaves, 795 B | 1.18 | 0.35 (48, 7 nodes) | 16.5 | 64 |
| 3 | B | valid | 3.00 | 1.42 | 8 leaves, 1863 B | 1.56 | 0.38 (109, 15 nodes) | 3.86 | 56 |
| 4 | B | valid | 4.00 | 1.61 | 16 leaves, 4247 B | 1.86 | 0.75 (275, 31 nodes) | 4.88 | 57 |
| 6 | B | valid | 6.00 | 3.97 | 64 leaves, 21031 B | 4.64 | 1.45 (1519, 127 nodes) | 11.0 | 63 |
| 8 | B | valid | 8.00 | 9.77 | 256 leaves, 100071 B | 13.3 | 3.93 (7659, 511 nodes) | 29.3 | 69 |
| 10 | B | valid | 10.0 | 26.9 | 1024 leaves, 466919 B | 47.2 | 16.1 (36839, 2047 nodes) | 97.6 | 88 |
| 12 | B | valid | 12.0 | 101.1 | 4096 leaves, 2143719 B | 175.3 | 81.8 (172003, 8191 nodes) | 383.8 | 154 |
| 14 | B | valid | 14.0 | 370.4 | 16384 leaves, 9674215 B | 694.2 | 372.3 (786399, 32767 nodes) | 1538 | 223 |
| 16 | B | valid | 16.0 | 1362 | 65536 leaves, 43089383 B | 3142 | 1925 (3538907, 131071 nodes) | 6852 | 526 |

### route

| n | strategy | verdict | consistent (log2) | search ms | certificate | check ms | coverage ms (work) | total ms | RSS MB |
|---|---|---|---|---|---|---|---|---|---|
| 0 | E | unresolved (no certificate) | 0.00 | 6.60 | 0 entries, 0 B | 0.00 | 0.02 (1) | 7.00 | 58 |
| 0 | A | unresolved (check: rests 0, 1 not declared disjoint) | 0.00 | 0.43 | 1, 210 B | 0.87 | 0.03 (1) | 1.52 | 55 |
| 0 | B | unresolved (no certificate: rests 0, 1 not declared disjoint) | 0.00 | 6.50 | 0 leaves,  B | 0.52 |  | 7.56 | 58 |
