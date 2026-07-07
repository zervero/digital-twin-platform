{{/*
Umbrella-level name / label / selector helpers. Each subchart
has its own _helpers.tpl for subchart-scoped templates.

Why split them: a subchart's "fullname" should NOT include the
umbrella's release name when it's used as a dependency. We keep
each chart self-contained so it can be lifted out and used on
its own later.
*/}}

{{/* Chart name + version. Used in chart label and image tag. */}}
{{- define "dtp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fully qualified app name. For the umbrella this is the release
name + chart name; if a nameOverride is set, use it directly.
*/}}
{{- define "dtp.fullname" -}}
{{- if .Values.nameOverride -}}
{{- .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/* Chart label. Reused by every resource. */}}
{{- define "dtp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Standard labels. The helm.sh/chart label is auto-generated;
app.kubernetes.io/* follow the recommended k8s labels
(https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/).
*/}}
{{- define "dtp.labels" -}}
helm.sh/chart: {{ include "dtp.chart" . }}
{{ include "dtp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: digital-twin-platform
{{- end -}}

{{/* Selector labels (subset of dtp.labels, used in spec.selector.matchLabels). */}}
{{- define "dtp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dtp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Namespace helper. Falls back to "default" if creation is off. */}}
{{- define "dtp.namespace" -}}
{{- if .Values.namespace.create -}}
{{- .Values.namespace.name -}}
{{- else -}}
{{- default "default" .Values.namespace.name -}}
{{- end -}}
{{- end -}}
