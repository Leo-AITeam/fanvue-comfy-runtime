# Anna v2 QC Policy

Дата: 2026-07-09

Статус: draft v1.

Назначение: единые правила проверки ассетов Anna v2 до публикации, dataset/LoRA, Fanvue feed или DM/PPV.

## 1. Главный принцип

Ни один ассет Anna v2 не получает production-статус без QC.

Приоритеты QC:

```text
Realism -> Age-safety -> Identity -> Anatomy -> Platform-fit -> Explicitness-fit
```

Если кадр красивый, но нарушает возрастной сигнал, identity или реализм, он отклоняется.

## 2. QC статусы

`approved`

- ассет соответствует Product Bible, Visual Bible и платформенному назначению;
- можно использовать в указанном канале.

`needs_edit`

- ассет в целом годится;
- допустимы crop, light color correction, minor background cleanup;
- нельзя исправлять identity drift или age-risk через легкий edit.

`regenerate`

- идея кадра верная, но реализация сломана;
- требуется повторная генерация с тем же brief или уточненным prompt/control.

`reject`

- ассет нельзя использовать;
- не идет в production, dataset или face passport;
- может попасть в anti-reference, если полезен как пример ошибки.

`manual_review`

- требуется решение владельца/оператора;
- применяется для спорных explicit, fetish/custom, AI/disclosure, age-safety, high-value fan и platform-risk случаев.

## 3. Общие проверки

Каждый ассет проверяется по чеклисту:

1. Anna выглядит взрослой 24-27, не моложе 21-22.
2. Нет teen-coded одежды, позы, мимики или реквизита.
3. Лицо соответствует Anna v2: soft oval/girl-next-door, grey-blue eyes, fuller natural lips.
4. Нет identity drift: это не другой человек.
5. Тело соответствует slim athletic / fitness crush.
6. Грудь natural medium, без silicone-ball эффекта.
7. Волосы warm honey blonde, длинные, natural/messy.
8. Кожа имеет текстуру, поры, натуральный тон.
9. Beauty marks не конфликтуют: ключица, бедро, легкие веснушки.
10. Нет broken anatomy, лишних пальцев, кривых рук/ног.
11. Кадр выглядит phone-native или разрешенно polished.
12. Локация и одежда соответствуют каналу.
13. Explicitness соответствует назначению.
14. Нет дешевого porn/webcam vibe.
15. Нет platform-risk для выбранного канала.

## 4. Instant reject

Сразу отклонять:

- teen-coded вайб;
- выглядит младше 21-22;
- школьная/college эстетика;
- детские принты, косички, инфантильные позы;
- plastic/waxy skin;
- отсутствие пор и skin texture;
- кукольные глаза или anime proportions;
- другой человек / identity drift;
- body proportions drift;
- broken anatomy;
- лишние пальцы/конечности;
- поплывшие глаза;
- деформированная грудь;
- силиконовый "шаровый" body look;
- AI-studio background;
- волосы врастают в кожу/одежду;
- cheap porn/webcam vibe;
- aggressive hardcore в первом test batch;
- Fanvue/DM-level explicit в Instagram/TikTok;
- реальные лица/identity, скопированные с reference.

## 5. Needs edit

Допустимый `needs_edit`:

- легкий crop;
- small background clutter;
- незначительная цветокоррекция;
- легкое усиление phone grain/compression;
- мелкий несущественный дефект на фоне;
- кадрирование для platform format.

Нельзя ставить `needs_edit`, если проблема в:

- возрасте;
- лице;
- body identity;
- анатомии;
- explicitness;
- platform violation.

## 6. Regenerate

Ставить `regenerate`, если:

- идея кадра подходит, но поза неестественна;
- свет портит лицо;
- камера выглядит слишком AI;
- мимика слабая или uncanny;
- одежда не попала в стиль;
- локация выглядит фейковой;
- пропал recurring item в кадре, где он обязателен;
- beauty marks поплыли, но identity в целом верная.

## 7. Social QC

Для Instagram / TikTok / Threads:

- только SFW или light teasing;
- без открытой груди;
- без прозрачной одежды с explicit signal;
- без strong adult caption;
- акцент на fitness, lifestyle, Odessa, girlfriend warmth;
- direct adult CTA запрещен;
- визуальный возраст строго adult.

Reject для social:

- любой намек на hardcore;
- lingerie/nude;
- слишком сексуализированная поза;
- visible nipples/genitals;
- cheap adult bait;
- platform-risk caption/visual.

## 8. X / Twitter QC

Для X:

- допускается stronger tease;
- сохранять premium creator vibe;
- не превращать в дешевый adult feed;
- ссылки на Fanvue допустимы;
- explicit escalation не должна ломать образ.

Manual review:

- сильный lingerie;
- cropped nude implication;
- спорный explicit teaser;
- агрессивный CTA.

## 9. Fanvue feed QC

Для Fanvue feed:

- teasing;
- lingerie;
- soft nude;
- эстетичный nude;
- personal creator feeling;
- не hardcore;
- не дешевый porn archive.

Reject:

- грубые anatomical close-ups;
- hardcore distribution;
- broken identity;
- кадр без лица/персональности, если он не часть утвержденного сета;
- низкое качество света/кожи.

## 10. Fanvue DM / PPV QC

Для DM/PPV:

- можно повышать explicitness только после стабилизации face/body;
- hardcore является будущим приватным слоем, не стартовым batch;
- каждый explicit/high-value set проходит manual review;
- сохранять premium/creator vibe;
- фокус на эстетике и страсти, а не дешевой анатомичности.

Manual review обязателен для:

- hardcore;
- custom;
- kink/fetish;
- high-value fan content;
- любого кадра с сомнительным platform-risk.

## 11. Test batch QC

Первый Anna v2 test batch:

- только SFW / Teasing / Lingerie-safe / Soft Nude по необходимости;
- без hardcore;
- без Fanvue-ready статуса;
- все результаты получают статус `test_batch_review`;
- нельзя использовать в production;
- нельзя использовать как dataset до отдельного approval.

Критерий успеха первого batch:

- 5-10 разноплановых кадров выглядят как один и тот же реальный человек;
- нет age-risk;
- нет plastic skin;
- нет broken anatomy;
- grey-blue eyes стабильны;
- body proportions стабильны;
- phone realism работает.

## 12. Dataset QC

В dataset можно брать только ассеты:

- approved для identity;
- без артефактов;
- без чужих фонов, которые могут впечься;
- без сильной ретуши;
- без NSFW в стартовом dataset;
- без реальных чужих лиц/identity.

Reject для dataset:

- смазанное лицо;
- другая структура лица;
- разные волосы/длина;
- нестабильное тело;
- сильная стилизация;
- background watermark/logos;
- explicit/NSFW на старте.

## 13. Face passport QC

Face passport создается только после успешного Anna v2 test batch.

Старая Анна:

```text
test_archive / anti-reference only
```

Face passport не может включать:

- old Anna face chain;
- старые locked-face решения;
- rejected emotion packs;
- кадры с identity drift;
- кадры, где Anna выглядит слишком юной.

## 14. Logging

Каждая QC запись должна хранить:

- asset id / file name;
- intended channel;
- intended explicitness;
- QC status;
- reject/regenerate reason;
- reviewer;
- date;
- next action.

Минимальные reason codes:

- `age_risk`;
- `identity_drift`;
- `plastic_skin`;
- `broken_anatomy`;
- `platform_risk`;
- `explicitness_mismatch`;
- `cheap_vibe`;
- `reference_copy_risk`;
- `needs_crop`;
- `needs_color_edit`.

