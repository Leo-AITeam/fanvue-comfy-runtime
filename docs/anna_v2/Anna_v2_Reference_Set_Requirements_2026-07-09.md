# Anna v2 Reference Set Requirements

Дата: 2026-07-09

Статус: draft v1.

Назначение: правила сбора и маркировки reference/anti-reference до первого Anna v2 test batch.

## 1. Главный принцип

Reference set нужен для направления, света, поз, одежды, локаций и camera language. Он не должен копировать identity реального человека.

Запрещено:

- обучать LoRA на лицах реальных блогеров/моделей без прав;
- копировать конкретную внешность;
- использовать celebrity/OF/Fanvue identity как основу Анны;
- брать reference с AI-артефактами как positive reference.

Anna v2 должна быть уникальным синтетическим персонажем.

## 2. Минимум до test batch

Перед первым test batch собрать:

```text
30-50 positive references
15-25 anti-references
```

Reference set должен быть утвержден вручную.

Без approved reference set production generation запрещена.

## 3. Структура папок

Рекомендуемая структура:

```text
Anna_v2_reference_set/
  Face/
  Body/
  Pose/
  Outfit/
  Lighting/
  Location/
  Camera/
  Anti-reference/
  Notes/
```

## 4. Face references

Назначение:

- mood по мягкости лица;
- adult age signal;
- natural beauty;
- expression direction.

Не использовать:

- лицо конкретного человека как identity;
- celebrity;
- AI doll faces;
- teen-coded faces;
- overfilled lips;
- fox eyes;
- anime proportions.

Что искать:

- soft oval / girl-next-door;
- grey-blue eye direction;
- natural lips;
- adult 24-27 appearance;
- relaxed confident gaze;
- natural skin texture.

## 5. Body references

Назначение:

- slim athletic / fitness crush body direction;
- natural medium chest behavior;
- waist/hips balance;
- posture and natural body mechanics.

Что искать:

- подтянутый живот;
- тонкая талия;
- округлые athletic hips/glutes;
- аккуратные плечи;
- natural medium chest;
- real anatomy in lying/standing poses.

Запрещено:

- extreme glamour body;
- silicone-ball chest;
- bodybuilder masculinity;
- teen-coded thinness;
- distorted proportions.

## 6. Pose references

Нужные позы:

- iPhone selfie;
- mirror selfie full-body;
- gym mirror;
- cafe sitting;
- bedroom sitting;
- soft teasing on bed;
- Odessa/sea walk;
- no-makeup daylight close-up;
- full-body casual;
- full-body fitness.

Запрещено:

- aggressive porn poses;
- грубое разведение ног в камеру;
- broken spine;
- teen-coded poses;
- "socks inward" shy childlike poses.

## 7. Outfit references

Free-content:

- jeans + top;
- leggings + crop top;
- white ribbed top;
- oversized home t-shirt;
- casual dress.

Fitness:

- black;
- charcoal;
- muted green;
- dusty pink.

Fanvue:

- black lace;
- ivory;
- champagne;
- deep emerald;
- premium lingerie;
- no cheap neon/webcam style.

## 8. Lighting references

Нужные типы:

- window light;
- bathroom mirror light;
- warm bedroom lamp;
- golden hour near sea;
- night flash;
- low contrast phone exposure.

Reject:

- cyber/fashion lighting;
- sterile studio;
- over-HDR;
- plastic skin lighting;
- AI-perfect bokeh.

## 9. Location references

Нужные локации:

- светлая квартира;
- bedroom;
- bathroom mirror;
- modern gym;
- cafe with windows/veranda;
- Odessa sea/walk;
- balcony/terrace with southern light;
- warm evening street.

Запрещено:

- luxury palace interiors;
- dirty backgrounds;
- abandoned buildings;
- futuristic AI studios;
- abstract glossy spaces.

## 10. Camera references

Нужные camera qualities:

- iPhone selfie;
- mirror selfie;
- candid by friend/boyfriend;
- mild compression;
- slight edge blur;
- imperfect focus;
- vertical 9:16;
- 4:5 feed crop.

Reject:

- too perfect studio depth;
- render-like sharpness;
- no phone artifacts;
- unrealistic bokeh.

## 11. Anti-reference

Anti-reference нужен как QC учебник.

Добавлять примеры:

- plastic skin;
- doll face;
- teen-coded styling;
- cheap porn/webcam vibe;
- broken fingers;
- AI hair artifacts;
- identity drift;
- body drift;
- unrealistic lighting;
- copied-real-person risk;
- old Anna test failures.

Старая Анна может использоваться только здесь:

```text
test_archive / anti-reference / technical lesson
```

## 12. Маркировка

Каждый reference получает тег.

Positive:

```text
[Approve: Face mood]
[Approve: Body proportion]
[Approve: Pose]
[Approve: Outfit]
[Approve: Light]
[Approve: Location]
[Approve: Camera]
```

Negative:

```text
[Reject: Plastic]
[Reject: Teen-coded]
[Reject: Cheap vibe]
[Reject: Broken anatomy]
[Reject: Too glossy]
[Reject: AI background]
[Reject: Copy risk]
```

## 13. Metadata

Для каждого reference фиксировать:

- file name;
- category;
- approve/reject tag;
- what to copy conceptually;
- what not to copy;
- source note;
- rights/licensing note if relevant.

## 14. Approval gate

Reference set считается готовым, если:

- есть 30-50 positive references;
- есть 15-25 anti-references;
- все файлы размечены;
- нет прямого копирования identity;
- есть examples для camera/light/body/pose/outfit/location;
- владелец проекта утвердил set.

После approval можно делать первый Anna v2 test batch.

