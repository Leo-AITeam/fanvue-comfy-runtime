# Anna v2 Dataset / LoRA Readiness Checklist

Дата: 2026-07-09

Статус: draft v1.

Назначение: критерии готовности перед production dataset и LoRA training для Anna v2.

## 1. Главный принцип

LoRA не должна начинаться, пока не утверждены:

- Product Bible;
- Visual Bible;
- Funnel Bible;
- Chat & Sales Bible;
- QC Policy;
- Reference Set;
- первый успешный Test Batch;
- Face Passport.

Сначала identity stability, потом adult/PPV уровни.

## 2. Запреты на стартовый dataset

В первый dataset нельзя включать:

- NSFW;
- hardcore;
- explicit PPV кадры;
- старую Анну;
- old face chain;
- реальные лица блогеров/моделей без прав;
- celebrity;
- кадры с plastic skin;
- кадры с identity drift;
- кадры, где Анна выглядит слишком юной;
- сильные фильтры;
- артефакты рук/волос/анатомии;
- фоны/логотипы, которые могут впечься.

## 3. Стартовый dataset

Стартовый подход:

```text
SFW face/body identity dataset
```

Цель:

- стабильное лицо;
- стабильный age-signal;
- стабильные волосы;
- стабильный body type;
- реалистичная кожа;
- широкий диапазон ракурсов.

Объем:

```text
25-40 approved images
```

## 4. Обязательные типы кадров

Face:

- front;
- 3/4 left;
- 3/4 right;
- profile;
- close-up daylight;
- indoor warm light;
- no-makeup close-up;
- light smile;
- intimate gaze.

Body:

- full-body casual;
- full-body fitness;
- mirror selfie;
- waist/hips visible;
- natural standing posture;
- sitting pose.

Context:

- apartment;
- gym;
- cafe;
- Odessa/sea;
- bedroom;
- bathroom mirror.

## 5. Dataset QC

Каждый dataset candidate должен быть:

- QC `approved`;
- adult 24-27;
- identity-stable;
- phone-realistic или approved polished portrait;
- без broken anatomy;
- без copied identity risk;
- без platform-risk.

Reject:

- blurred face;
- inconsistent eye color;
- wrong hair length/color;
- body drift;
- over-glam;
- teen-coded;
- AI background;
- cheap vibe.

## 6. Разделение LoRA

Рекомендуемый подход:

1. Сначала face/identity stability.
2. Body/style контролировать через base model, prompts, ControlNet/reference и QC.
3. Отдельно тестировать body consistency.
4. Не смешивать hardcore с identity LoRA на старте.

Причина:

- меньше overfit;
- ниже риск дешевого adult bias;
- проще контролировать identity;
- проще исправлять body/style отдельно.

## 7. Критерии готовности к training

Training можно начинать, если:

- Face Passport approved;
- есть 25-40 dataset candidates;
- все candidates QC approved;
- нет old Anna production references;
- reference set approved;
- anti-reference set есть;
- explicit/hardcore исключен;
- владелец проекта подтвердил visual direction.

## 8. Критерии успешной LoRA

LoRA считается рабочей, если:

```text
Anna узнаваема в 8 из 10 генераций на разных промптах, одежде и локациях
```

Дополнительные критерии:

- grey-blue eyes сохраняются;
- soft oval/girl-next-door face сохраняется;
- hair stable;
- age stable;
- skin не пластиковая;
- body не превращается в другой тип;
- работает в квартире, gym, cafe, Odessa/sea;
- работает в selfie/mirror/candid.

## 9. Риски

Overfit:

- одно выражение лица;
- один ракурс;
- одинаковая прическа;
- повторяющиеся фоны;
- "залипание" в конкретный reference.

Face drift:

- меняется костная структура;
- меняются глаза;
- губы становятся oversized;
- лицо уходит в old Anna или generic AI girl.

Body drift:

- грудь становится silicone/glamour;
- талия/бедра плавают;
- body становится слишком худым/юным;
- fitness переходит в masculine.

Plastic skin:

- пропадают поры;
- появляется waxy shine;
- лицо становится fashion-render.

Copied identity:

- слишком похожа на reference-модель;
- есть узнаваемость реального блогера;
- LoRA обучена на неразрешенном лице.

## 10. Post-training test

После training сделать тест:

- 10 prompts;
- разные локации;
- разные outfits;
- разные camera styles;
- SFW/teasing only;
- no hardcore.

Обязательные тесты:

1. Apartment selfie.
2. Gym mirror.
3. Cafe candid.
4. Odessa golden hour.
5. Bedroom warm light.
6. No-makeup daylight.
7. Full-body casual.
8. Full-body fitness.
9. Teasing home.
10. Outdoor portrait.

## 11. Go / no-go

Go:

- 8/10 recognizable;
- no age-risk;
- no copied identity;
- skin realism acceptable;
- body stable;
- QC approved.

No-go:

- ниже 8/10;
- age-risk;
- plastic skin;
- identity drift;
- copied reference risk;
- only one angle works;
- old Anna leakage.

## 12. Next after LoRA readiness

После успешной LoRA:

1. Расширить expression set.
2. Расширить body/pose tests.
3. Создать controlled Fanvue feed batch.
4. Создать private DM/PPV test только после отдельного QC.
5. Hardcore подключать только как будущий private DM/PPV слой после стабильной identity.

